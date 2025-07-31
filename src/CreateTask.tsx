import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Card, Flex, Text, TextArea, TextField, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon, CheckIcon } from "@radix-ui/react-icons";
import { useNetworkVariable } from "./networkConfig";

interface CreateTaskProps {
  onTaskCreated: (taskId: string) => void;
}

export function CreateTask({ onTaskCreated }: CreateTaskProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("2"); // Default to Medium priority
  const [isCreating, setIsCreating] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "error" | "success"; message: string } | null>(null);
  
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
      setAlertMessage({ type: "error", message: "Please enter both title and description" });
      return;
    }

    setIsCreating(true);
    setAlertMessage(null); // Clear any previous alerts
    
    // Convert due date to timestamp (0 if no due date)
    const dueDateTimestamp = dueDate ? Math.floor(new Date(dueDate).getTime() / 1000) : 0;
    
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::task_manager::create_task`,
      arguments: [
        tx.pure.vector("u8", Array.from(new TextEncoder().encode(title))),
        tx.pure.vector("u8", Array.from(new TextEncoder().encode(description))),
        tx.pure.u64(dueDateTimestamp),
        tx.pure.u8(parseInt(priority)),
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
            setAlertMessage({ type: "success", message: "Task created successfully!" });
            onTaskCreated(createdTaskId);
            setTitle("");
            setDescription("");
            setDueDate("");
            setPriority("2");
            // Clear success message after 3 seconds
            setTimeout(() => setAlertMessage(null), 3000);
          }
          setIsCreating(false);
        },
        onError: (error) => {
          console.error("Error creating task:", error);
          setAlertMessage({ type: "error", message: "Failed to create task. Please try again." });
          setIsCreating(false);
        },
      }
    );
  };

  return (
    <Card>
      <Flex direction="column" gap="4">
        <Text size="5" weight="bold">Create New Task</Text>
        
        {alertMessage && (
          <Callout.Root color={alertMessage.type === "error" ? "red" : "green"}>
            <Callout.Icon>
              {alertMessage.type === "error" ? <ExclamationTriangleIcon /> : <CheckIcon />}
            </Callout.Icon>
            <Callout.Text>{alertMessage.message}</Callout.Text>
          </Callout.Root>
        )}
        
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

        <Flex gap="4">
          <Flex direction="column" gap="2" style={{ flex: 1 }}>
            <Text size="3" weight="medium">Due Date (Optional)</Text>
            <TextField.Root
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isCreating}
            />
          </Flex>

          <Flex direction="column" gap="2" style={{ flex: 1 }}>
            <Text size="3" weight="medium">Priority</Text>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={isCreating}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--gray-7)",
                backgroundColor: "var(--color-background)",
                color: "var(--gray-12)",
                fontSize: "14px"
              }}
            >
              <option value="1">Low</option>
              <option value="2">Medium</option>
              <option value="3">High</option>
              <option value="4">Critical</option>
            </select>
          </Flex>
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
