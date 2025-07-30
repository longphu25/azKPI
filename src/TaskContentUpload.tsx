import { useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Card, Flex, Text, TextArea, Spinner } from "@radix-ui/themes";
import { SealClient, getAllowlistedKeyServers } from "@mysten/seal";
import { fromHex, toHex } from "@mysten/sui/utils";
import { useNetworkVariable } from "./networkConfig";

interface TaskContentUploadProps {
  taskId: string;
  onContentUploaded?: () => void;
}

export function TaskContentUpload({ taskId, onContentUploaded }: TaskContentUploadProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedService, setSelectedService] = useState("service1");

  const suiClient = useSuiClient();
  const packageId = useNetworkVariable("taskManagerPackageId");

  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
        },
      }),
  });

  // Create SealClient following official SEAL patterns from documentation
  const sealClient = new SealClient({
    suiClient,
    serverConfigs: getAllowlistedKeyServers("testnet").map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false, // Set to false for performance as recommended in docs
  });

  const walrusServices = [
    {
      id: "service1",
      name: "walrus.space",
      publisherUrl: "https://publisher.walrus-testnet.walrus.space",
      aggregatorUrl: "https://aggregator.walrus-testnet.walrus.space",
    },
    {
      id: "service2", 
      name: "staketab.org",
      publisherUrl: "https://walrus-testnet-publisher.staketab.org",
      aggregatorUrl: "https://wal-aggregator-testnet.staketab.org",
    },
    {
      id: "service3",
      name: "nodes.guru", 
      publisherUrl: "https://walrus-testnet-publisher.nodes.guru",
      aggregatorUrl: "https://walrus-testnet-aggregator.nodes.guru",
    },
    {
      id: "service4",
      name: "blockscope.net",
      publisherUrl: "https://walrus-testnet-publisher.blockscope.net",
      aggregatorUrl: "https://walrus-testnet.blockscope.net",
    },
    {
      id: "service5",
      name: "overclock.run",
      publisherUrl: "https://walrus-testnet-publisher.overclock.run",
      aggregatorUrl: "https://sui-walrus-testnet.overclock.run",
    },
  ];

  const getPublisherUrl = (path: string): string => {
    const service = walrusServices.find((s) => s.id === selectedService);
    if (!service) {
      throw new Error("No Walrus service selected");
    }
    
    // Clean the path and ensure it starts with /v1/
    const cleanPath = path.replace(/^\/+/, "");
    const fullPath = cleanPath.startsWith("v1/") ? cleanPath : `v1/${cleanPath}`;
    
    return `${service.publisherUrl}/${fullPath}`;
  };

  const uploadToWalrus = async (data: Uint8Array): Promise<string> => {
    const url = getPublisherUrl("/blobs");
    console.log("Uploading to Walrus URL:", url);
    console.log("Data size:", data.length, "bytes");
    
    try {
      const response = await fetch(url, {
        method: "PUT",
        body: data as BodyInit,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      console.log("Walrus response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Walrus error response:", errorText);
        throw new Error(`Failed to upload to Walrus: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Walrus response:", JSON.stringify(result, null, 2));
      
      // Extract blob ID using official patterns
      let blobId: string;
      if (result.newlyCreated?.blobObject?.blobId) {
        blobId = result.newlyCreated.blobObject.blobId;
      } else if (result.alreadyCertified?.blobId) {
        blobId = result.alreadyCertified.blobId;
      } else {
        throw new Error(`Could not extract blobId from Walrus response: ${JSON.stringify(result)}`);
      }
      
      console.log("Successfully uploaded, blob ID:", blobId);
      return blobId;
      
    } catch (error) {
      console.error("Walrus upload error:", error);
      throw error;
    }
  };

  const encryptAndUploadContent = async (): Promise<string> => {
    const contentBytes = new TextEncoder().encode(content);
    const nonce = crypto.getRandomValues(new Uint8Array(5));
    const taskIdBytes = fromHex(taskId);
    const id = toHex(new Uint8Array([...taskIdBytes, ...nonce]));

    // Follow official SEAL encryption patterns
    const { encryptedObject } = await sealClient.encrypt({
      threshold: 2,
      packageId: packageId, // Keep as string - SEAL library handles conversion
      id: id, // Keep as string - SEAL library handles conversion
      data: contentBytes,
    });

    return await uploadToWalrus(encryptedObject);
  };

  const encryptAndUploadFiles = async (): Promise<string[]> => {
    if (!files || files.length === 0) return [];

    const blobIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileBytes = await file.arrayBuffer();
      const nonce = crypto.getRandomValues(new Uint8Array(5));
      const taskIdBytes = fromHex(taskId);
      const id = toHex(new Uint8Array([...taskIdBytes, ...nonce, i]));

      // Follow official SEAL encryption patterns
      const { encryptedObject } = await sealClient.encrypt({
        threshold: 2,
        packageId: packageId, // Keep as string - SEAL library handles conversion
        id: id, // Keep as string - SEAL library handles conversion
        data: new Uint8Array(fileBytes),
      });

      const blobId = await uploadToWalrus(encryptedObject);
      blobIds.push(blobId);
    }

    return blobIds;
  };

  const handleUpload = async () => {
    if (!content.trim() && (!files || files.length === 0)) {
      alert("Please enter content or select files to upload");
      return;
    }

    setIsUploading(true);

    try {
      const tx = new Transaction();

      // Upload content if provided - following SEAL encryption patterns
      if (content.trim()) {
        try {
          const contentBlobId = await encryptAndUploadContent();
          tx.moveCall({
            target: `${packageId}::task_manager::add_content`,
            arguments: [
              tx.object(taskId),
              tx.pure.vector("u8", Array.from(new TextEncoder().encode(contentBlobId))),
            ],
          });
        } catch (contentError) {
          console.error("Error encrypting/uploading content:", contentError);
          throw new Error(`Content encryption failed: ${(contentError as any)?.message || contentError}`);
        }
      }

      // Upload files if provided - following SEAL encryption patterns
      if (files && files.length > 0) {
        try {
          const fileBlobIds = await encryptAndUploadFiles();
          const encodedBlobIds = fileBlobIds.map(id => 
            Array.from(new TextEncoder().encode(id))
          );
          tx.moveCall({
            target: `${packageId}::task_manager::add_files`,
            arguments: [
              tx.object(taskId),
              tx.pure.vector("vector<u8>", encodedBlobIds),
            ],
          });
        } catch (filesError) {
          console.error("Error encrypting/uploading files:", filesError);
          throw new Error(`File encryption failed: ${(filesError as any)?.message || filesError}`);
        }
      }

      tx.setGasBudget(10000000);

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            alert("Content and files uploaded successfully!");
            setContent("");
            setFiles(null);
            onContentUploaded?.();
            setIsUploading(false);
          },
          onError: (error) => {
            console.error("Error executing transaction:", error);
            alert(`Failed to upload content and files: ${(error as any)?.message || error}`);
            setIsUploading(false);
          },
        }
      );
    } catch (error) {
      console.error("Error during upload process:", error);
      alert(`Failed to encrypt and upload data: ${(error as any)?.message || error}`);
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <Flex direction="column" gap="4">
        <Text size="5" weight="bold">Add Content and Files</Text>

        <Flex direction="column" gap="2">
          <Text size="3" weight="medium">Walrus Service</Text>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            disabled={isUploading}
          >
            {walrusServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="3" weight="medium">Content</Text>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter task content... This will be encrypted and stored on Walrus"
            rows={6}
            disabled={isUploading}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="3" weight="medium">Files</Text>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            disabled={isUploading}
            style={{ padding: "8px" }}
          />
          <Text size="2" color="gray">
            Select multiple files to attach. Files will be encrypted and stored on Walrus.
          </Text>
        </Flex>

        {isUploading && (
          <Flex align="center" gap="2">
            <Spinner />
            <Text>Encrypting and uploading to Walrus...</Text>
          </Flex>
        )}

        <Button
          onClick={handleUpload}
          disabled={isUploading || (!content.trim() && (!files || files.length === 0))}
          size="3"
        >
          {isUploading ? "Uploading..." : "Encrypt & Upload to Walrus"}
        </Button>
      </Flex>
    </Card>
  );
}
