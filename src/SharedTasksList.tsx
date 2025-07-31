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
  due_date: string;
  priority: number;
}

export function SharedTasksList() {
  const [sharedTasks, setSharedTasks] = useState<SharedTaskItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const packageId = useNetworkVariable("taskManagerPackageId");

  // Helper function to format priority
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return { label: "Low", color: "green" };
      case 2: return { label: "Medium", color: "blue" };
      case 3: return { label: "High", color: "orange" };
      case 4: return { label: "Critical", color: "red" };
      default: return { label: "Unknown", color: "gray" };
    }
  };

  // Helper function to format due date
  const formatDueDate = (due_date: string) => {
    if (due_date === "0") return "No due date";
    const date = new Date(parseInt(due_date) * 1000);
    return date.toLocaleDateString();
  };

  // Helper function to check if task is overdue
  const isOverdue = (due_date: string, is_completed: boolean) => {
    if (due_date === "0" || is_completed) return false;
    const dueTime = parseInt(due_date) * 1000;
    return Date.now() > dueTime;
  };

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
                    due_date: fields.due_date || "0",
                    priority: fields.priority || 1,
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
            {sharedTasks.map((task) => {
              const priorityInfo = getPriorityLabel(task.priority);
              const overdueStatus = isOverdue(task.due_date, task.is_completed);
              
              return (
                <Card key={task.id} style={{ 
                  padding: "1rem",
                  border: overdueStatus ? "2px solid var(--red-9)" : undefined,
                  backgroundColor: overdueStatus ? "var(--red-2)" : undefined
                }}>
                  <Flex justify="between" align="center">
                    <Flex direction="column" gap="1">
                      <Flex align="center" gap="2">
                        <Text size="4" weight="medium">
                          {task.title}
                        </Text>
                        <Text size="1" style={{ 
                          padding: "2px 8px", 
                          borderRadius: "4px", 
                          backgroundColor: `var(--${priorityInfo.color}-3)`,
                          color: `var(--${priorityInfo.color}-11)`
                        }}>
                          {priorityInfo.label}
                        </Text>
                        {overdueStatus && (
                          <Text size="1" style={{ 
                            padding: "2px 8px", 
                            borderRadius: "4px", 
                            backgroundColor: "var(--red-9)",
                            color: "white"
                          }}>
                            OVERDUE
                          </Text>
                        )}
                      </Flex>
                      <Text size="2" color="gray">
                        {task.description}
                      </Text>
                      <Text size="1" color="gray">
                        Created by: {task.creator.slice(0, 10)}...
                      </Text>
                      <Flex gap="3">
                        <Text size="1" color="gray">
                          Status: {task.is_completed ? "Completed" : "In Progress"}
                        </Text>
                        <Text size="1" color="gray">
                          Due: {formatDueDate(task.due_date)}
                        </Text>
                      </Flex>
                    </Flex>
                    <Button
                      size="2"
                      onClick={() => setSelectedTask(task.id)}
                    >
                      View Task
                    </Button>
                  </Flex>
                </Card>
              );
            })}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
