import React, { useState, useEffect } from "react";
import { Card, Flex, Text, Button, Dialog, Box, Strong } from "@radix-ui/themes";
import { useCurrentAccount, useSuiClient, useSignPersonalMessage } from "@mysten/dapp-kit";
import { useNetworkVariable } from "./networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import { SealClient, SessionKey, getAllowlistedKeyServers, EncryptedObject, NoAccessError } from "@mysten/seal";

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

const TaskViewer: React.FC<TaskViewerProps> = ({ taskId }) => {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const packageId = useNetworkVariable("taskManagerPackageId");
  const { mutate: signPersonalMessage } = useSignPersonalMessage();

  const [task, setTask] = useState<Task | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string>("");
  const [decryptedFiles, setDecryptedFiles] = useState<Array<{ name: string; url: string; type: string }>>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize SealClient
  const sealClient = new SealClient({
    suiClient,
    serverConfigs: getAllowlistedKeyServers('testnet').map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
  });

  // Walrus aggregator endpoints
  const aggregators = [
    "https://aggregator-devnet.walrus.space",
    "https://wal-aggregator-testnet.staketab.org",
    "https://walrus-testnet-aggregator.bartestnet.com",
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

  const downloadAndDecryptFiles = async (
    blobIds: string[],
    sessionKey: SessionKey,
    moveCallConstructor: (tx: Transaction, id: string) => void
  ): Promise<Array<{ name: string; url: string; type: string }>> => {
    // Download encrypted files from Walrus aggregators
    const validDownloads: { data: ArrayBuffer; blobId: string }[] = [];
    
    for (const blobId of blobIds) {
      let downloaded = false;
      for (const aggregator of aggregators) {
        try {
          const url = `${aggregator}/v1/blobs/${blobId}`;
          console.log("Downloading from:", url);
          
          const response = await fetch(url, {
            signal: AbortSignal.timeout(10000),
          });
          
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            validDownloads.push({ data: arrayBuffer, blobId });
            downloaded = true;
            console.log("Successfully downloaded blob:", blobId, "from", aggregator);
            break;
          }
        } catch (error) {
          console.warn(`Failed to download from ${aggregator}:`, error);
        }
      }
      
      if (!downloaded) {
        console.warn("Failed to download blob from all aggregators:", blobId);
      }
    }

    if (validDownloads.length === 0) {
      throw new Error('Cannot retrieve files from Walrus aggregators. Files may have expired or services are unavailable.');
    }

    console.log(`Downloaded ${validDownloads.length} files successfully`);

    // Fetch keys in batches of ≤10 for rate limiting
    const batchSize = 10;
    for (let i = 0; i < validDownloads.length; i += batchSize) {
      const batch = validDownloads.slice(i, i + batchSize);
      const ids = batch.map(item => {
        const encryptedObj = EncryptedObject.parse(new Uint8Array(item.data));
        return encryptedObj.id;
      });
      
      const tx = new Transaction();
      ids.forEach(id => moveCallConstructor(tx, id));
      const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
      
      try {
        console.log(`Fetching keys for batch ${Math.floor(i / batchSize) + 1}, IDs:`, ids);
        await sealClient.fetchKeys({ 
          ids, 
          txBytes, 
          sessionKey, 
          threshold: 2 
        });
        console.log("Keys fetched successfully for batch");
      } catch (err) {
        console.error("fetchKeys error for batch:", err);
        if (err instanceof NoAccessError) {
          throw new Error('No access to decryption keys - check task permissions');
        }
        
        // Try with threshold 1 as fallback
        try {
          console.log("Retrying with threshold 1...");
          await sealClient.fetchKeys({ 
            ids, 
            txBytes, 
            sessionKey, 
            threshold: 1 
          });
          console.log("Keys fetched successfully with threshold 1");
        } catch (retryErr) {
          console.error("Retry with threshold 1 also failed:", retryErr);
          throw new Error('Unable to fetch decryption keys from key servers');
        }
      }
    }

    // Decrypt files sequentially
    const decryptedFiles: Array<{ name: string; url: string; type: string }> = [];
    for (let i = 0; i < validDownloads.length; i++) {
      const { data } = validDownloads[i];
      const encryptedObj = EncryptedObject.parse(new Uint8Array(data));
      
      const tx = new Transaction();
      moveCallConstructor(tx, encryptedObj.id);
      const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
      
      try {
        console.log(`Decrypting file ${i + 1}/${validDownloads.length}`);
        // Keys are already fetched, this only does local decryption
        const decryptedFile = await sealClient.decrypt({
          data: new Uint8Array(data),
          sessionKey,
          txBytes,
        });
        
        // Try to determine file type from content
        let mimeType = 'application/octet-stream';
        if (decryptedFile.length > 0) {
          const header = new Uint8Array(decryptedFile.slice(0, 4));
          if (header[0] === 0xFF && header[1] === 0xD8) {
            mimeType = 'image/jpeg';
          } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
            mimeType = 'image/png';
          } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
            mimeType = 'image/gif';
          }
        }
        
        const blob = new Blob([new Uint8Array(decryptedFile)], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        decryptedFiles.push({
          name: `File ${i + 1}`,
          url,
          type: mimeType,
        });
        
        console.log(`File ${i + 1} decrypted successfully, type: ${mimeType}`);
      } catch (err) {
        console.error(`Failed to decrypt file ${i + 1}:`, err);
        // Continue with other files instead of failing completely
      }
    }
    
    return decryptedFiles;
  };

  const decryptTaskContent = async () => {
    if (!task || !currentAccount) {
      setError("Task or account not available");
      return;
    }

    if (!packageId) {
      setError("Package ID not configured");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Starting decryption process...");
      console.log("Current account:", currentAccount.address);
      console.log("Package ID:", packageId);
      console.log("Task ID:", taskId);
      
      // Check access control before proceeding
      const hasAccess = task.creator === currentAccount.address || 
                       task.shared_with.includes(currentAccount.address);
      
      if (!hasAccess) {
        throw new Error("You don't have access to this task. Only the creator or users the task is shared with can decrypt the content.");
      }
      
      // Create session key
      console.log("Creating session key...");
      const sessionKey = new SessionKey({
        address: currentAccount.address,
        packageId: packageId,
        ttlMin: 30,
        suiClient,
      });
      
      // Get personal message for signing
      const message = sessionKey.getPersonalMessage();
      console.log("Session key created, requesting signature...");
      
      // Sign the message with user's wallet
      await signPersonalMessage(
        { message: message },
        {
          onSuccess: async (result) => {
            try {
              console.log("Personal message signed successfully");
              await sessionKey.setPersonalMessageSignature(result.signature);
              console.log("Session key initialized successfully");
              
              // Move call constructor for access control
              const moveCallConstructor = (tx: Transaction, encryptionId: string) => {
                tx.moveCall({
                  target: `${packageId}::task_manager::seal_approve`,
                  arguments: [
                    tx.pure.vector("u8", Array.from(new TextEncoder().encode(encryptionId))),
                    tx.object(taskId)
                  ],
                });
              };

              // Decrypt content if available
              if (task.content_blob_id) {
                console.log("Decrypting content...");
                const contentData = await downloadFromWalrus(task.content_blob_id);
                if (contentData) {
                  const encryptedContent = EncryptedObject.parse(contentData);
                  
                  // Fetch key for content
                  const tx = new Transaction();
                  moveCallConstructor(tx, encryptedContent.id);
                  const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
                  
                  await sealClient.fetchKeys({
                    ids: [encryptedContent.id],
                    txBytes,
                    sessionKey,
                    threshold: 2,
                  });
                  
                  // Decrypt content
                  const decryptedBytes = await sealClient.decrypt({
                    data: contentData,
                    sessionKey,
                    txBytes,
                  });
                  
                  const contentText = new TextDecoder().decode(decryptedBytes);
                  setDecryptedContent(contentText);
                  console.log("Content decrypted successfully");
                }
              }

              // Decrypt files if available
              if (task.file_blob_ids && task.file_blob_ids.length > 0) {
                console.log(`Decrypting ${task.file_blob_ids.length} files...`);
                const decryptedFileUrls = await downloadAndDecryptFiles(
                  task.file_blob_ids,
                  sessionKey,
                  moveCallConstructor
                );
                setDecryptedFiles(decryptedFileUrls);
                console.log(`${decryptedFileUrls.length} files decrypted successfully`);
              }

              setIsDialogOpen(true);
              setIsLoading(false);
              
            } catch (decryptError) {
              console.error("Decryption process failed:", decryptError);
              handleDecryptionError(decryptError);
            }
          },
          onError: (error) => {
            console.error("Failed to sign personal message:", error);
            setError("Failed to sign message. Please try again.");
            setIsLoading(false);
          },
        }
      );
      
    } catch (error: unknown) {
      console.error("Error in decryptTaskContent:", error);
      handleDecryptionError(error);
    }
  };

  const handleDecryptionError = (error: unknown) => {
    console.error("Decryption error details:", error);
    
    let errorMsg: string;
    if (error === null || error === undefined) {
      errorMsg = "Unknown decryption error occurred";
    } else if (error instanceof NoAccessError) {
      errorMsg = "Access denied: You don't have permission to decrypt this task";
    } else if (error instanceof Error) {
      const message = error.message;
      if (message.includes("access") || message.includes("permission")) {
        errorMsg = "Access denied: Check if task is shared with you or you are the creator";
      } else if (message.includes("fetchKeys")) {
        errorMsg = "Failed to fetch decryption keys from key servers";
      } else if (message.includes("Walrus")) {
        errorMsg = "Failed to download files from storage - they may have expired";
      } else {
        errorMsg = `Decryption failed: ${message}`;
      }
    } else if (typeof error === 'string') {
      errorMsg = `Decryption failed: ${error}`;
    } else {
      errorMsg = "Decryption failed due to an unknown error";
    }
    
    setError(errorMsg);
    setIsLoading(false);
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
          <Strong>{task.title}</Strong>
          <Text color="gray">{task.description}</Text>
          <Text size="2" color="gray">
            Created by: {task.creator === currentAccount?.address ? "You" : task.creator}
          </Text>
          <Text size="2" color="gray">
            Shared with: {task.shared_with.length} users
          </Text>
          <Text size="2" color="gray">
            Status: {task.is_completed ? "Completed" : "In Progress"}
          </Text>
          {task.content_blob_id && (
            <Text size="2" color="blue">
              Has encrypted content
            </Text>
          )}
          {task.file_blob_ids.length > 0 && (
            <Text size="2" color="blue">
              Has {task.file_blob_ids.length} encrypted file(s)
            </Text>
          )}
        </Flex>

        <Button 
          onClick={decryptTaskContent} 
          disabled={isLoading || !currentAccount || (!task.content_blob_id && task.file_blob_ids.length === 0)}
          loading={isLoading}
        >
          {isLoading ? "Decrypting..." : "View Content & Download Files"}
        </Button>

        {error && (
          <Box p="3" style={{ backgroundColor: "#fee", borderRadius: "6px" }}>
            <Text color="red" size="2">
              {error}
            </Text>
          </Box>
        )}

        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Content maxWidth="800px">
            <Dialog.Title>Decrypted Task Content</Dialog.Title>
            <Dialog.Description>
              {decryptedContent || decryptedFiles.length > 0 ? (
                <Flex direction="column" gap="4">
                  {decryptedContent && (
                    <Box>
                      <Strong>Content:</Strong>
                      <Box p="3" style={{ backgroundColor: "#f9f9f9", borderRadius: "6px", marginTop: "8px" }}>
                        <Text style={{ whiteSpace: "pre-wrap" }}>{decryptedContent}</Text>
                      </Box>
                    </Box>
                  )}
                  
                  {decryptedFiles.length > 0 && (
                    <Box>
                      <Strong>Files ({decryptedFiles.length}):</Strong>
                      <Flex direction="column" gap="2" style={{ marginTop: "8px" }}>
                        {decryptedFiles.map((file, index) => (
                          <Flex key={index} justify="between" align="center" p="2" style={{ backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
                            <Text>{file.name}</Text>
                            <Flex gap="2">
                              {file.type.startsWith('image/') && (
                                <Button size="1" variant="soft" onClick={() => window.open(file.url, '_blank')}>
                                  View
                                </Button>
                              )}
                              <Button size="1" asChild>
                                <a href={file.url} download={file.name}>
                                  Download
                                </a>
                              </Button>
                            </Flex>
                          </Flex>
                        ))}
                      </Flex>
                    </Box>
                  )}
                </Flex>
              ) : (
                <Text>No content found to decrypt.</Text>
              )}
            </Dialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Close
                </Button>
              </Dialog.Close>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>
    </Card>
  );
};

export { TaskViewer };
