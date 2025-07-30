import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { Card, Flex, Text, Button } from "@radix-ui/themes";
import { TaskViewer } from "./TaskViewer";
import { useNetworkVariable } from "./networkConfig";

interface SharedTaskItem {
  id: string;
  title: string;
  description: string;
  creator: string;
  is_completed: boolean;
}

export function SharedTasksList() {
  const [sharedTasks, setSharedTasks] = useState<SharedTaskItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const packageId = useNetworkVariable("taskManagerPackageId");

  useEffect(() => {
    if (currentAccount) {
      fetchSharedTasks();
    }
  }, [currentAccount]);

  const fetchSharedTasks = async () => {
    if (!currentAccount) return;

    setIsLoading(true);
    try {
      // Query TaskShared events to find tasks shared with this user
      const events = await suiClient.queryEvents({
        query: {
          MoveModule: {
            package: packageId,
            module: "task_manager",
          },
        },
        limit: 100,
      });

      const tasks: SharedTaskItem[] = [];

      for (const event of events.data) {
        if (event.type.includes("TaskShared")) {
          const parsedJson = event.parsedJson as any;
          
          // Check if current user is in the shared_with list
          if (parsedJson.shared_with?.includes(currentAccount.address)) {
            try {
              const taskObject = await suiClient.getObject({
                id: parsedJson.task_id,
                options: { showContent: true },
              });

              if (taskObject.data?.content && "fields" in taskObject.data.content) {
                const fields = taskObject.data.content.fields as any;
                
                // Only add if not already in the list
                const exists = tasks.some(t => t.id === parsedJson.task_id);
                if (!exists) {
                  tasks.push({
                    id: parsedJson.task_id,
                    title: fields.title,
                    description: fields.description,
                    creator: fields.creator,
                    is_completed: fields.is_completed,
                  });
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch shared task ${parsedJson.task_id}:`, error);
            }
          }
        }
      }

      setSharedTasks(tasks);
    } catch (error) {
      console.error("Error fetching shared tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedTask) {
    return (
      <Card>
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center">
            <Text size="5" weight="bold">Shared Task</Text>
            <Button
              variant="soft"
              onClick={() => setSelectedTask(null)}
            >
              Back to Shared Tasks
            </Button>
          </Flex>
          <TaskViewer taskId={selectedTask} />
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center">
          <Text size="5" weight="bold">Shared Tasks ({sharedTasks.length})</Text>
          <Button 
            onClick={fetchSharedTasks} 
            variant="soft"
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
        </Flex>

        {sharedTasks.length === 0 ? (
          <Text color="gray" style={{ textAlign: "center", padding: "2rem" }}>
            {isLoading ? "Loading shared tasks..." : "No tasks have been shared with you yet."}
          </Text>
        ) : (
          <Flex direction="column" gap="3">
            {sharedTasks.map((task) => (
              <Card key={task.id} style={{ padding: "1rem" }}>
                <Flex justify="between" align="center">
                  <Flex direction="column" gap="1">
                    <Text size="4" weight="medium">
                      {task.title}
                    </Text>
                    <Text size="2" color="gray">
                      {task.description}
                    </Text>
                    <Text size="1" color="gray">
                      Created by: {task.creator.slice(0, 10)}...
                    </Text>
                    <Text size="1" color="gray">
                      Status: {task.is_completed ? "Completed" : "In Progress"}
                    </Text>
                  </Flex>
                  <Button
                    size="2"
                    onClick={() => setSelectedTask(task.id)}
                  >
                    View Task
                  </Button>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
