import { useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";
import { isValidSuiAddress } from "@mysten/sui/utils";

interface TaskSharingProps {
  taskId: string;
  onShared?: () => void;
}

export function TaskSharing({ taskId, onShared }: TaskSharingProps) {
  const [shareWith, setShareWith] = useState("");
  const [isSharing, setIsSharing] = useState(false);

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

  const shareTask = () => {
    const addresses = shareWith
      .split(",")
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);

    if (addresses.length === 0) {
      alert("Please enter at least one valid address");
      return;
    }

    // Validate all addresses
    for (const addr of addresses) {
      if (!isValidSuiAddress(addr)) {
        alert(`Invalid Sui address: ${addr}`);
        return;
      }
    }

    setIsSharing(true);

    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::task_manager::share_task`,
      arguments: [
        tx.object(taskId),
        tx.pure.vector("address", addresses),
      ],
    });
    tx.setGasBudget(10000000);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          alert("Task shared successfully!");
          setShareWith("");
          onShared?.();
          setIsSharing(false);
        },
        onError: (error) => {
          console.error("Error sharing task:", error);
          alert("Failed to share task");
          setIsSharing(false);
        },
      }
    );
  };

  return (
    <Card>
      <Flex direction="column" gap="4">
        <Text size="5" weight="bold">Share Task</Text>

        <Flex direction="column" gap="2">
          <Text size="3" weight="medium">Share with users (comma-separated addresses)</Text>
          <TextField.Root
            value={shareWith}
            onChange={(e) => setShareWith(e.target.value)}
            placeholder="0x123..., 0x456..."
            disabled={isSharing}
          />
          <Text size="2" color="gray">
            Enter Sui wallet addresses separated by commas. Shared users will be able to decrypt and view the task content and files.
          </Text>
        </Flex>

        <Button
          onClick={shareTask}
          disabled={!shareWith.trim() || isSharing}
          size="3"
        >
          {isSharing ? "Sharing..." : "Share Task"}
        </Button>
      </Flex>
    </Card>
  );
}
