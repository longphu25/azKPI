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

  // Walrus aggregator endpoints (ordered by reliability)
  const aggregators = [
    "https://walrus-testnet-aggregator.nodes.guru",
    "https://walrus-testnet.blockscope.net",
    "https://sui-walrus-testnet.overclock.run",
    "https://wal-aggregator-testnet.staketab.org",
    "https://aggregator-devnet.walrus.space",
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
    
    const workingAggregators: string[] = [];
    const failedAggregators: string[] = [];
    
    for (const aggregator of aggregators) {
      try {
        const url = `${aggregator}/v1/blobs/${blobId}`;
        console.log("Trying to download from:", url);
        
        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000), // Reduced timeout to 8 seconds
        });
        
        console.log("Response status:", response.status, "from", aggregator);
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          console.log("Successfully downloaded from:", aggregator, "Size:", arrayBuffer.byteLength);
          workingAggregators.push(aggregator);
          return new Uint8Array(arrayBuffer);
        } else {
          console.warn(`HTTP ${response.status} from ${aggregator}`);
          failedAggregators.push(`${aggregator} (HTTP ${response.status})`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to download from ${aggregator}:`, errorMsg);
        failedAggregators.push(`${aggregator} (${errorMsg})`);
      }
    }
    
    console.error("Failed to download blob from all aggregators");
    console.error("Failed aggregators:", failedAggregators);
    console.error("Working aggregators:", workingAggregators);
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
      const failedAttempts: string[] = [];
      
      for (const aggregator of aggregators) {
        try {
          const url = `${aggregator}/v1/blobs/${blobId}`;
          console.log("Downloading from:", url);
          
          const response = await fetch(url, {
            signal: AbortSignal.timeout(8000), // Reduced timeout
          });
          
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            validDownloads.push({ data: arrayBuffer, blobId });
            downloaded = true;
            console.log("Successfully downloaded blob:", blobId, "from", aggregator);
            break;
          } else {
            failedAttempts.push(`${aggregator} (HTTP ${response.status})`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          failedAttempts.push(`${aggregator} (${errorMsg})`);
          console.warn(`Failed to download from ${aggregator}:`, errorMsg);
        }
      }
      
      if (!downloaded) {
        console.warn("Failed to download blob from all aggregators:", blobId);
        console.warn("Failed attempts:", failedAttempts);
      }
    }

    if (validDownloads.length === 0) {
      throw new Error('Cannot retrieve files from Walrus aggregators. Files may have expired or services are unavailable.');
    }

    console.log(`Downloaded ${validDownloads.length} files successfully`);

    // Fetch keys in batches of ≤10 for rate limiting (official pattern)
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
        // Keys are already fetched, this only does local decryption (official pattern)
        const decryptedFile = await sealClient.decrypt({
          data: new Uint8Array(data),
          sessionKey,
          txBytes,
        });
        
        // Enhanced MIME type detection following official patterns
        let mimeType = 'application/octet-stream';
        if (decryptedFile.length > 0) {
          const header = new Uint8Array(decryptedFile.slice(0, 8));
          // More comprehensive file type detection
          if (header[0] === 0xFF && header[1] === 0xD8) {
            mimeType = 'image/jpeg';
          } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
            mimeType = 'image/png';
          } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
            mimeType = 'image/gif';
          } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
            mimeType = 'image/webp';
          } else if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
            mimeType = 'application/pdf';
          } else if (header[0] === 0x50 && header[1] === 0x4B) {
            // ZIP-based formats (Office documents, etc.)
            mimeType = 'application/zip';
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
      
      // Create session key following official patterns
      console.log("Creating session key...");
      console.log("Current account address:", currentAccount.address);
      console.log("Package ID:", packageId);
      console.log("Sui client:", !!suiClient);
      
      if (!packageId) {
        throw new Error("Package ID is undefined - check network configuration");
      }
      
      if (!currentAccount.address) {
        throw new Error("Current account address is undefined");
      }
      
      let sessionKey;
      try {
        sessionKey = new SessionKey({
          address: currentAccount.address,
          packageId: packageId,
          ttlMin: 30,
          suiClient,
        });
        console.log("Session key created successfully");
      } catch (sessionError) {
        console.error("Failed to create session key:", sessionError);
        throw new Error(`Session key creation failed: ${(sessionError as any)?.message || sessionError}`);
      }
      
      // Get personal message for signing
      let message;
      try {
        message = sessionKey.getPersonalMessage();
        console.log("Personal message retrieved:", message?.length ? "✓" : "✗");
        console.log("Session key created, requesting signature...");
        
        if (!message) {
          throw new Error("Personal message is undefined");
        }
      } catch (messageError) {
        console.error("Failed to get personal message:", messageError);
        throw new Error(`Personal message retrieval failed: ${(messageError as any)?.message || messageError}`);
      }
      
      // Sign the message with user's wallet
      await signPersonalMessage(
        { message: message },
        {
          onSuccess: async (result) => {
            try {
              console.log("Personal message signed successfully");
              console.log("Signature received:", !!result.signature);
              
              if (!result.signature) {
                throw new Error("No signature received from wallet");
              }
              
              await sessionKey.setPersonalMessageSignature(result.signature);
              console.log("Session key initialized successfully");
              
              // Verify session key is properly initialized
              console.log("Session key address:", sessionKey.getAddress());
              console.log("Session key package ID:", sessionKey.getPackageId());
              
              // Create SealClient following official patterns
              let sealClient;
              try {
                sealClient = new SealClient({
                  suiClient,
                  serverConfigs: getAllowlistedKeyServers('testnet').map((id) => ({
                    objectId: id,
                    weight: 1,
                  })),
                  verifyKeyServers: false,
                });
                console.log("SealClient created successfully");
                
                if (!sealClient) {
                  throw new Error("SealClient instance is undefined");
                }
              } catch (clientError) {
                console.error("Failed to create SealClient:", clientError);
                throw new Error(`SealClient creation failed: ${(clientError as any)?.message || clientError}`);
              }
              
              // Move call constructor for access control following official patterns
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
                console.log("Content blob ID:", task.content_blob_id);
                
                try {
                  const contentData = await downloadFromWalrus(task.content_blob_id);
                  console.log("Download result:", contentData ? "Success" : "Failed");
                  
                  if (contentData) {
                    console.log("Content downloaded successfully, size:", contentData.length);
                    
                    let encryptedContent;
                    try {
                      encryptedContent = EncryptedObject.parse(contentData);
                      console.log("Encrypted content parsed, ID:", encryptedContent.id);
                    } catch (parseError) {
                      console.error("Failed to parse encrypted content:", parseError);
                      throw new Error(`Failed to parse encrypted content: ${(parseError as any)?.message || parseError}`);
                    }
                    
                    // Fetch key for content following official patterns
                    let tx, txBytes;
                    try {
                      tx = new Transaction();
                      moveCallConstructor(tx, encryptedContent.id);
                      txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
                      console.log("Transaction built successfully for content");
                    } catch (txError) {
                      console.error("Failed to build transaction:", txError);
                      throw new Error(`Transaction build failed: ${(txError as any)?.message || txError}`);
                    }
                    
                    try {
                      console.log("Fetching keys for content...");
                      await sealClient.fetchKeys({
                        ids: [encryptedContent.id],
                        txBytes,
                        sessionKey,
                        threshold: 2,
                      });
                      console.log("Keys fetched successfully for content");
                    } catch (keyError) {
                      console.error("Failed to fetch keys:", keyError);
                      throw new Error(`Key fetch failed: ${(keyError as any)?.message || keyError}`);
                    }
                    
                    try {
                      // Decrypt content
                      console.log("Decrypting content...");
                      const decryptedBytes = await sealClient.decrypt({
                        data: contentData,
                        sessionKey,
                        txBytes,
                      });
                      
                      const contentText = new TextDecoder().decode(decryptedBytes);
                      setDecryptedContent(contentText);
                      console.log("Content decrypted successfully, length:", contentText.length);
                    } catch (decryptError) {
                      console.error("Failed to decrypt content:", decryptError);
                      throw new Error(`Content decrypt failed: ${(decryptError as any)?.message || decryptError}`);
                    }
                  } else {
                    console.warn("Failed to download content from Walrus");
                    throw new Error("Content download from Walrus failed - all aggregators returned null");
                  }
                } catch (contentError) {
                  console.error("Error decrypting content:", contentError);
                  console.error("Content error type:", typeof contentError);
                  console.error("Content error details:", {
                    message: (contentError as any)?.message,
                    stack: (contentError as any)?.stack,
                    name: (contentError as any)?.name,
                    constructor: contentError?.constructor?.name
                  });
                  throw new Error(`Content decryption failed: ${(contentError as any)?.message || contentError || 'Unknown error'}`);
                }
              }

              // Decrypt files if available
              if (task.file_blob_ids && task.file_blob_ids.length > 0) {
                console.log(`Decrypting ${task.file_blob_ids.length} files...`);
                console.log("File blob IDs:", task.file_blob_ids);
                
                try {
                  const decryptedFileUrls = await downloadAndDecryptFiles(
                    task.file_blob_ids,
                    sessionKey,
                    moveCallConstructor
                  );
                  setDecryptedFiles(decryptedFileUrls);
                  console.log(`${decryptedFileUrls.length} files decrypted successfully`);
                } catch (filesError) {
                  console.error("Error decrypting files:", filesError);
                  throw new Error(`File decryption failed: ${(filesError as any)?.message || filesError}`);
                }
              }

              setIsDialogOpen(true);
              setIsLoading(false);
              
            } catch (decryptError) {
              console.error("Decryption process failed:", decryptError);
              console.error("Error type:", typeof decryptError);
              console.error("Error constructor:", decryptError?.constructor?.name);
              console.error("Error details:", {
                message: (decryptError as any)?.message,
                stack: (decryptError as any)?.stack,
                name: (decryptError as any)?.name,
                toString: decryptError?.toString?.()
              });
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
      console.error("Outer error type:", typeof error);
      console.error("Outer error constructor:", error?.constructor?.name);
      console.error("Outer error details:", {
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        name: (error as any)?.name,
        toString: error?.toString?.()
      });
      handleDecryptionError(error);
    }
  };

  const handleDecryptionError = (error: unknown) => {
    console.error("Decryption error details:", error);
    console.error("Error inspection:", {
      type: typeof error,
      constructor: error?.constructor?.name,
      isNull: error === null,
      isUndefined: error === undefined,
      isNoAccessError: error instanceof NoAccessError,
      isError: error instanceof Error,
      stringValue: String(error),
      jsonValue: (() => {
        try {
          return JSON.stringify(error);
        } catch {
          return "Cannot stringify error";
        }
      })()
    });
    
    let errorMsg: string;
    if (error === null || error === undefined) {
      errorMsg = "Unknown decryption error occurred - error object is null/undefined";
    } else if (error instanceof NoAccessError) {
      errorMsg = "Access denied: You don't have permission to decrypt this task";
    } else if (error instanceof Error) {
      const message = error.message;
      console.error("Error message:", message);
      if (message.includes("access") || message.includes("permission")) {
        errorMsg = "Access denied: Check if task is shared with you or you are the creator";
      } else if (message.includes("fetchKeys")) {
        errorMsg = "Failed to fetch decryption keys from key servers";
      } else if (message.includes("Walrus")) {
        errorMsg = "Failed to download files from storage - they may have expired";
      } else if (message.includes("Session")) {
        errorMsg = "Session key error - please try signing again";
      } else if (message.includes("Transaction")) {
        errorMsg = "Transaction building error - check access control";
      } else {
        errorMsg = `Decryption failed: ${message}`;
      }
    } else if (typeof error === 'string') {
      errorMsg = `Decryption failed: ${error}`;
    } else {
      // Handle cases where error is not a standard Error object
      const errorStr = String(error);
      if (errorStr === "[object Object]") {
        errorMsg = "Decryption failed due to an unknown error - check console for details";
      } else {
        errorMsg = `Decryption failed: ${errorStr}`;
      }
    }
    
    console.error("Final error message:", errorMsg);
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
