import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading, Tabs } from "@radix-ui/themes";
import { TaskManager } from "./TaskManager";
import { LandingPage } from "./LandingPage";

function App() {
  const currentAccount = useCurrentAccount();

  return (
    <>
      {currentAccount ? (
        <>
          <Flex
            position="sticky"
            px="4"
            py="2"
            justify="between"
            style={{
              borderBottom: "1px solid var(--gray-a2)",
            }}
          >
            <Box>
              <Heading>azKPI - Task Management with Walrus</Heading>
            </Box>

            <Box>
              <ConnectButton />
            </Box>
          </Flex>
          <Container>
            <Container
              mt="5"
              pt="2"
              px="4"
              style={{ background: "var(--gray-a2)", minHeight: 500 }}
            >
              <Tabs.Root defaultValue="tasks">
                <Tabs.List>
                  <Tabs.Trigger value="tasks">Task Manager</Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="tasks" style={{ marginTop: "1rem" }}>
                  <TaskManager />
                </Tabs.Content>
              </Tabs.Root>
            </Container>
          </Container>
        </>
      ) : (
        <LandingPage />
      )}
    </>
  );
}

export default App;
