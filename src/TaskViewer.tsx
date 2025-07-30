import { useState, useEffect } from "react";
import { useCurrentAccount, useSignPersonalMessage, useSuiClient } from "@mysten/dapp-kit";
import { Button, Card, Flex, Text, Dialog, Spinner } from "@radix-ui/themes";
import { SealClient, SessionKey, getAllowlistedKeyServers, EncryptedObject, NoAccessError } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "./networkConfig";

interface Task {
  id: string;
  creator: string;
  title: string;
  description: string;
  content_blob_id: string;
  file_blob_ids: string[];
  shared_with: string[];
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface TaskViewerProps {
  taskId: string;
}

export function TaskViewer({ taskId }: TaskViewerProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string>("");
  const [decryptedFiles, setDecryptedFiles] = useState<Array<{ name: string; url: string; type: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const packageId = useNetworkVariable("taskManagerPackageId");
  const { mutate: signPersonalMessage } = useSignPersonalMessage();

  const sealClient = new SealClient({
    suiClient,
    serverConfigs: getAllowlistedKeyServers("testnet").map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
  });

  const aggregators = [
    "https://aggregator.walrus-testnet.walrus.space",
    "https://walrus-testnet-aggregator.staketab.org",
    "https://walrus-testnet-aggregator.redundex.com",
  ];

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const taskObject = await suiClient.getObject({
        id: taskId,
        options: { showContent: true },
      });

      if (taskObject.data?.content && "fields" in taskObject.data.content) {
        const fields = taskObject.data.content.fields as any;
        setTask({
          id: taskId,
          creator: fields.creator,
          title: fields.title,
          description: fields.description,
          content_blob_id: fields.content_blob_id,
          file_blob_ids: fields.file_blob_ids || [],
          shared_with: fields.shared_with || [],
          is_completed: fields.is_completed,
          created_at: fields.created_at,
          updated_at: fields.updated_at,
        });
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      setError("Failed to fetch task");
    }
  };

  const downloadFromWalrus = async (blobId: string): Promise<Uint8Array | null> => {
    console.log("Downloading blob:", blobId);
    
    for (const aggregator of aggregators) {
      try {
        const url = `${aggregator}/v1/blobs/${blobId}`;
        console.log("Trying to download from:", url);
        
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });
        
        console.log("Response status:", response.status, "from", aggregator);
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          console.log("Successfully downloaded from:", aggregator, "Size:", arrayBuffer.byteLength);
          return new Uint8Array(arrayBuffer);
        }
      } catch (error) {
        console.warn(`Failed to download from ${aggregator}:`, error);
      }
    }
    
    console.error("Failed to download blob from all aggregators");
    return null;
  };

  const decryptTaskContent = async () => {
    if (!task || !currentAccount) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log("Creating session key...");
      
      // Create session key instance first
      const sessionKey = new SessionKey({
        address: currentAccount.address,
        packageId: packageId, // Keep as string, SessionKey expects string
        ttlMin: 30,
        suiClient,
      });
      
      // Get the personal message that needs to be signed
      const message = sessionKey.getPersonalMessage();
      console.log("Personal message to sign:", message);
      
      // Create a promise to handle the signing
      const signature = await new Promise<string>((resolve, reject) => {
        signPersonalMessage(
          {
            message: message,
          },
          {
            onSuccess: (result) => {
              console.log("Signature received:", result);
              resolve(result.signature);
            },
            onError: (error) => {
              console.error("Signature error:", error);
              reject(error);
            },
          }
        );
      });
      
      // Set the signature to complete initialization
      sessionKey.setPersonalMessageSignature(signature);
      console.log("Session key initialized successfully");

      // Decrypt content if available
      if (task.content_blob_id) {
        console.log("Decrypting content with blob ID:", task.content_blob_id);
        const contentData = await downloadFromWalrus(task.content_blob_id);
        if (contentData) {
          const encryptedContent = EncryptedObject.parse(contentData);
          console.log("Encrypted content parsed:", encryptedContent.id);
          
          const tx = new Transaction();
          tx.moveCall({
            target: `${packageId}::task_manager::seal_approve`,
            arguments: [
              tx.pure.vector("u8", Array.from(new TextEncoder().encode(encryptedContent.id))),
              tx.object(taskId)
            ],
          });
          const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });

          console.log("Fetching keys for decryption...");
          await sealClient.fetchKeys({
            ids: [encryptedContent.id],
            txBytes,
            sessionKey,
            threshold: 2,
          });

          console.log("Decrypting content...");
          const decryptedBytes = await sealClient.decrypt({
            data: contentData,
            sessionKey,
            txBytes,
          });

          const contentText = new TextDecoder().decode(decryptedBytes);
          console.log("Content decrypted successfully");
          setDecryptedContent(contentText);
        }
      }

      // Decrypt files if available
      if (task.file_blob_ids && task.file_blob_ids.length > 0) {
        console.log("Decrypting", task.file_blob_ids.length, "files");
        const decryptedFileUrls: Array<{ name: string; url: string; type: string }> = [];

        for (let i = 0; i < task.file_blob_ids.length; i++) {
          const fileBlobId = task.file_blob_ids[i];
          console.log(`Decrypting file ${i + 1}:`, fileBlobId);
          
          const fileData = await downloadFromWalrus(fileBlobId);
          if (fileData) {
            const encryptedFile = EncryptedObject.parse(fileData);
            
            const tx = new Transaction();
            tx.moveCall({
              target: `${packageId}::task_manager::seal_approve`,
              arguments: [
                tx.pure.vector("u8", Array.from(new TextEncoder().encode(encryptedFile.id))),
                tx.object(taskId)
              ],
            });
            const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });

            await sealClient.fetchKeys({
              ids: [encryptedFile.id],
              txBytes,
              sessionKey,
              threshold: 2,
            });

            const decryptedFileBytes = await sealClient.decrypt({
              data: fileData,
              sessionKey,
              txBytes,
            });

            const blob = new Blob([decryptedFileBytes as BlobPart]);
            const url = URL.createObjectURL(blob);
            
            decryptedFileUrls.push({
              name: `File ${i + 1}`,
              url,
              type: "application/octet-stream",
            });
          }
        }

        setDecryptedFiles(decryptedFileUrls);
      }

      setIsDialogOpen(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Decryption error:", error);
      const errorMsg = error instanceof NoAccessError
        ? "You don't have access to this task"
        : "Failed to decrypt content";
      setError(errorMsg);
      setIsLoading(false);
    }
  };

  if (!task) {
    return (
      <Card>
        <Text>Loading task...</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="2">
          <Text size="6" weight="bold">{task.title}</Text>
          <Text size="3" color="gray">{task.description}</Text>
          <Text size="2" color="gray">
            Created by: {task.creator.slice(0, 10)}...
          </Text>
          <Text size="2" color="gray">
            Status: {task.is_completed ? "Completed" : "In Progress"}
          </Text>
        </Flex>

        {error && (
          <Text color="red" size="3">{error}</Text>
        )}

        <Flex direction="column" gap="2">
          <Text size="4" weight="medium">Content & Files</Text>
          {task.content_blob_id && (
            <Text size="2" color="gray">✓ Encrypted content available</Text>
          )}
          {task.file_blob_ids.length > 0 && (
            <Text size="2" color="gray">✓ {task.file_blob_ids.length} encrypted file(s) available</Text>
          )}
          
          {!task.content_blob_id && task.file_blob_ids.length === 0 && (
            <Text size="2" color="gray">No content or files uploaded yet</Text>
          )}
        </Flex>

        {(task.content_blob_id || task.file_blob_ids.length > 0) && currentAccount && (
          <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Dialog.Trigger>
              <Button
                onClick={decryptTaskContent}
                disabled={isLoading}
                size="3"
              >
                {isLoading ? (
                  <Flex align="center" gap="2">
                    <Spinner size="1" />
                    Decrypting...
                  </Flex>
                ) : (
                  "View Content & Download Files"
                )}
              </Button>
            </Dialog.Trigger>

            <Dialog.Content maxWidth="600px">
              <Dialog.Title>Task Content & Files</Dialog.Title>
              
              <Flex direction="column" gap="4" mt="4">
                {decryptedContent && (
                  <Flex direction="column" gap="2">
                    <Text size="4" weight="bold">Content:</Text>
                    <Card style={{ padding: "12px", backgroundColor: "var(--gray-a3)" }}>
                      <Text size="3" style={{ whiteSpace: "pre-wrap" }}>
                        {decryptedContent}
                      </Text>
                    </Card>
                  </Flex>
                )}

                {decryptedFiles.length > 0 && (
                  <Flex direction="column" gap="2">
                    <Text size="4" weight="bold">Files:</Text>
                    {decryptedFiles.map((file, index) => (
                      <Card key={index} style={{ padding: "12px" }}>
                        <Flex justify="between" align="center">
                          <Text size="3">{file.name}</Text>
                          <Button
                            size="2"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = file.url;
                              a.download = file.name;
                              a.click();
                            }}
                          >
                            Download
                          </Button>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                )}
              </Flex>

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Close
                  </Button>
                </Dialog.Close>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        )}

        {task.shared_with.length > 0 && (
          <Flex direction="column" gap="2">
            <Text size="3" weight="medium">Shared with:</Text>
            {task.shared_with.map((address, index) => (
              <Text key={index} size="2" color="gray">
                {address.slice(0, 10)}...
              </Text>
            ))}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
