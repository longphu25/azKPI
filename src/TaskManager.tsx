import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { Card, Flex, Text, Button, Tabs, Container } from "@radix-ui/themes";
import { CreateTask } from "./CreateTask";
import { TaskContentUpload } from "./TaskContentUpload";
import { TaskSharing } from "./TaskSharing";
import { TaskViewer } from "./TaskViewer";
import { SharedTasksList } from "./SharedTasksList";
import { useNetworkVariable } from "./networkConfig";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  creator: string;
  is_completed: boolean;
  created_at: string;
  due_date: string;
  priority: number;
}

export function TaskManager() {
  const [userTasks, setUserTasks] = useState<TaskItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("create");

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
      fetchUserTasks();
    }
  }, [currentAccount]);

  const fetchUserTasks = async () => {
    if (!currentAccount) return;

    try {
      // Query events to find tasks created by or shared with the user
      const events = await suiClient.queryEvents({
        query: {
          MoveModule: {
            package: packageId,
            module: "task_manager",
          },
        },
        limit: 50,
      });

      const tasks: TaskItem[] = [];

      for (const event of events.data) {
        if (event.type.includes("TaskCreated")) {
          const parsedJson = event.parsedJson as any;
          if (parsedJson.creator === currentAccount.address) {
            // Fetch full task details
            try {
              const taskObject = await suiClient.getObject({
                id: parsedJson.task_id,
                options: { showContent: true },
              });

              if (taskObject.data?.content && "fields" in taskObject.data.content) {
                const fields = taskObject.data.content.fields as any;
                tasks.push({
                  id: parsedJson.task_id,
                  title: fields.title,
                  description: fields.description,
                  creator: fields.creator,
                  is_completed: fields.is_completed,
                  created_at: fields.created_at,
                  due_date: fields.due_date || "0",
                  priority: fields.priority || 1,
                });
              }
            } catch (error) {
              console.warn(`Failed to fetch task ${parsedJson.task_id}:`, error);
            }
          }
        }
      }

      // Remove duplicates and sort by creation time
      const uniqueTasks = tasks.filter((task, index, self) => 
        index === self.findIndex(t => t.id === task.id)
      );
      
      setUserTasks(uniqueTasks.sort((a, b) => parseInt(b.created_at) - parseInt(a.created_at)));
    } catch (error) {
      console.error("Error fetching user tasks:", error);
    }
  };

  const handleTaskCreated = (taskId: string) => {
    setSelectedTask(taskId);
    setActiveTab("manage");
    fetchUserTasks();
  };

  const handleTaskUpdated = () => {
    fetchUserTasks();
  };

  if (!currentAccount) {
    return (
      <Container>
        <Card style={{ 
          textAlign: "center", 
          padding: "3rem",
          background: "linear-gradient(135deg, hsl(var(--blue-2)) 0%, hsl(var(--purple-2)) 100%)"
        }}>
          <Flex direction="column" gap="4" align="center">
            <Text size="6" weight="bold">Welcome to azKPI Task Manager</Text>
            <Text size="4" color="gray" style={{ maxWidth: "500px" }}>
              Connect your Sui wallet to start creating, managing, and sharing tasks 
              with blockchain-secured workflows and encrypted file storage.
            </Text>
            <Text size="3" color="gray">
              Your decentralized workspace awaits
            </Text>
          </Flex>
        </Card>
      </Container>
    );
  }

  return (
    <Container style={{ maxWidth: "1200px" }}>
      <Flex direction="column" gap="4">
        <Card style={{ padding: "1.5rem" }}>
          <Text size="6" weight="bold">Task Manager</Text>
          <Text size="3" color="gray" style={{ marginTop: "0.5rem" }}>
            Create tasks with encrypted content and files stored on Walrus. Share with other users securely.
          </Text>
        </Card>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Trigger value="create">Create Task</Tabs.Trigger>
            <Tabs.Trigger value="my-tasks">My Tasks ({userTasks.length})</Tabs.Trigger>
            <Tabs.Trigger value="shared-tasks">Shared With Me</Tabs.Trigger>
            {selectedTask && <Tabs.Trigger value="manage">Manage Task</Tabs.Trigger>}
          </Tabs.List>

          <Tabs.Content value="create" style={{ marginTop: "1rem" }}>
            <CreateTask onTaskCreated={handleTaskCreated} />
          </Tabs.Content>

          <Tabs.Content value="my-tasks" style={{ marginTop: "1rem" }}>
            <Card>
              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Text size="5" weight="bold">My Tasks</Text>
                  <Button onClick={fetchUserTasks} variant="soft">
                    Refresh
                  </Button>
                </Flex>

                {userTasks.length === 0 ? (
                  <Text color="gray" style={{ textAlign: "center", padding: "2rem" }}>
                    No tasks created yet. Create your first task to get started.
                  </Text>
                ) : (
                  <Flex direction="column" gap="3">
                    {userTasks.map((task) => {
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
                              <Flex gap="3">
                                <Text size="1" color="gray">
                                  Status: {task.is_completed ? "Completed" : "In Progress"}
                                </Text>
                                <Text size="1" color="gray">
                                  Due: {formatDueDate(task.due_date)}
                                </Text>
                              </Flex>
                            </Flex>
                            <Flex gap="2">
                              <Button
                                size="2"
                                variant="soft"
                                onClick={() => {
                                  setSelectedTask(task.id);
                                  setActiveTab("manage");
                                }}
                              >
                                Manage
                              </Button>
                            </Flex>
                          </Flex>
                        </Card>
                      );
                    })}
                  </Flex>
                )}
              </Flex>
            </Card>
          </Tabs.Content>

          <Tabs.Content value="shared-tasks" style={{ marginTop: "1rem" }}>
            <SharedTasksList />
          </Tabs.Content>

          {selectedTask && (
            <Tabs.Content value="manage" style={{ marginTop: "1rem" }}>
              <Flex direction="column" gap="4">
                <Card style={{ padding: "1rem" }}>
                  <Flex justify="between" align="center">
                    <Text size="4" weight="bold">
                      Managing Task: {selectedTask.slice(0, 8)}...
                    </Text>
                    <Button
                      variant="soft"
                      onClick={() => {
                        setSelectedTask(null);
                        setActiveTab("my-tasks");
                      }}
                    >
                      Back to Tasks
                    </Button>
                  </Flex>
                </Card>

                <Tabs.Root defaultValue="view">
                  <Tabs.List>
                    <Tabs.Trigger value="view">View Task</Tabs.Trigger>
                    <Tabs.Trigger value="upload">Add Content & Files</Tabs.Trigger>
                    <Tabs.Trigger value="share">Share Task</Tabs.Trigger>
                  </Tabs.List>

                  <Tabs.Content value="view" style={{ marginTop: "1rem" }}>
                    <TaskViewer taskId={selectedTask} />
                  </Tabs.Content>

                  <Tabs.Content value="upload" style={{ marginTop: "1rem" }}>
                    <TaskContentUpload 
                      taskId={selectedTask} 
                      onContentUploaded={handleTaskUpdated}
                    />
                  </Tabs.Content>

                  <Tabs.Content value="share" style={{ marginTop: "1rem" }}>
                    <TaskSharing 
                      taskId={selectedTask} 
                      onShared={handleTaskUpdated}
                    />
                  </Tabs.Content>
                </Tabs.Root>
              </Flex>
            </Tabs.Content>
          )}
        </Tabs.Root>
      </Flex>
    </Container>
  );
}
