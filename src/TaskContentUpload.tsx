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

  const sealClient = new SealClient({
    suiClient,
    serverConfigs: getAllowlistedKeyServers("testnet").map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
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
      aggregatorUrl: "https://walrus-testnet-aggregator.staketab.org",
    },
    {
      id: "service3",
      name: "redundex.com", 
      publisherUrl: "https://walrus-testnet-publisher.redundex.com",
      aggregatorUrl: "https://walrus-testnet-aggregator.redundex.com",
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
    const url = getPublisherUrl("/blobs?epochs=1");
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
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Walrus error response:", errorText);
        throw new Error(`Failed to upload to Walrus: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();
      console.log("Raw response text:", responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        console.log("Response was not valid JSON, trying to extract blob ID from text");
        
        // Try to extract blob ID from text response (some APIs return plain text)
        const blobIdMatch = responseText.match(/[a-fA-F0-9]{64}/);
        if (blobIdMatch) {
          console.log("Extracted blob ID from text:", blobIdMatch[0]);
          return blobIdMatch[0];
        }
        
        throw new Error(`Invalid JSON response from Walrus: ${responseText}`);
      }
      
      console.log("Parsed Walrus response:", JSON.stringify(result, null, 2));
      console.log("Response type:", typeof result);
      console.log("Response keys:", Object.keys(result || {}));
      
      // Handle different possible response formats
      if (result && typeof result === 'object') {
        // Check for direct blobId in response
        if (result.blobId) {
          console.log("Found blobId directly:", result.blobId);
          return result.blobId;
        }
        
        // Check for newlyCreated structure (most common for new uploads)
        if (result.newlyCreated?.blobObject?.blobId) {
          console.log("Found newlyCreated blobId:", result.newlyCreated.blobObject.blobId);
          return result.newlyCreated.blobObject.blobId;
        }
        
        // Check for alreadyCertified structure (for existing blobs)
        if (result.alreadyCertified?.blobId) {
          console.log("Found alreadyCertified blobId:", result.alreadyCertified.blobId);
          return result.alreadyCertified.blobId;
        }
        
        // Check for nested info structure (legacy format)
        if (result.info) {
          console.log("Found info object:", result.info);
          if ("alreadyCertified" in result.info && result.info.alreadyCertified?.blobId) {
            console.log("Found info.alreadyCertified blobId:", result.info.alreadyCertified.blobId);
            return result.info.alreadyCertified.blobId;
          } else if ("newlyCreated" in result.info && result.info.newlyCreated?.blobObject?.blobId) {
            console.log("Found info.newlyCreated blobId:", result.info.newlyCreated.blobObject.blobId);
            return result.info.newlyCreated.blobObject.blobId;
          }
        }
        
        // Check for other possible formats
        if (result.data?.blobId) {
          console.log("Found data.blobId:", result.data.blobId);
          return result.data.blobId;
        }
        
        if (result.blob_id) {
          console.log("Found blob_id:", result.blob_id);
          return result.blob_id;
        }
        
        // Check if result itself is a string (blob ID)
        if (typeof result === 'string' && result.length >= 40) {
          console.log("Response is a blob ID string:", result);
          return result;
        }
      }
      
      console.error("Could not extract blobId from response. Available fields:", Object.keys(result || {}));
      throw new Error(`Could not extract blobId from Walrus response: ${JSON.stringify(result)}`);
      
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

    const { encryptedObject } = await sealClient.encrypt({
      threshold: 2,
      packageId,
      id,
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

      const { encryptedObject } = await sealClient.encrypt({
        threshold: 2,
        packageId,
        id,
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

      // Upload content if provided
      if (content.trim()) {
        const contentBlobId = await encryptAndUploadContent();
        tx.moveCall({
          target: `${packageId}::task_manager::add_content`,
          arguments: [
            tx.object(taskId),
            tx.pure.vector("u8", Array.from(new TextEncoder().encode(contentBlobId))),
          ],
        });
      }

      // Upload files if provided
      if (files && files.length > 0) {
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
            console.error("Error uploading:", error);
            alert("Failed to upload content and files");
            setIsUploading(false);
          },
        }
      );
    } catch (error) {
      console.error("Error during upload:", error);
      alert("Failed to encrypt and upload data");
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
