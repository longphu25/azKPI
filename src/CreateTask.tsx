import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Card, Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";

interface CreateTaskProps {
  onTaskCreated: (taskId: string) => void;
}

export function CreateTask({ onTaskCreated }: CreateTaskProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const currentAccount = useCurrentAccount();
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

  const createTask = () => {
    if (!title.trim() || !description.trim()) {
      alert("Please enter both title and description");
      return;
    }

    setIsCreating(true);
    
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::task_manager::create_task`,
      arguments: [
        tx.pure.vector("u8", Array.from(new TextEncoder().encode(title))),
        tx.pure.vector("u8", Array.from(new TextEncoder().encode(description))),
      ],
    });
    tx.setGasBudget(10000000);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async (result) => {
          console.log("Task created:", result);
          
          // Extract the created task object ID from the transaction result
          const taskObject = result.effects?.created?.find(
            (item) => item.owner && typeof item.owner === "object" && "Shared" in item.owner
          );
          
          const createdTaskId = taskObject?.reference?.objectId;
          if (createdTaskId) {
            onTaskCreated(createdTaskId);
            setTitle("");
            setDescription("");
          }
          setIsCreating(false);
        },
        onError: (error) => {
          console.error("Error creating task:", error);
          alert("Failed to create task");
          setIsCreating(false);
        },
      }
    );
  };

  return (
    <Card>
      <Flex direction="column" gap="4">
        <Text size="5" weight="bold">Create New Task</Text>
        
        <Flex direction="column" gap="2">
          <Text size="3" weight="medium">Title</Text>
          <TextField.Root
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title..."
            disabled={isCreating}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="3" weight="medium">Description</Text>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description..."
            rows={4}
            disabled={isCreating}
          />
        </Flex>

        <Button
          onClick={createTask}
          disabled={!title.trim() || !description.trim() || isCreating || !currentAccount}
          size="3"
        >
          {isCreating ? "Creating..." : "Create Task"}
        </Button>
      </Flex>
    </Card>
  );
}
