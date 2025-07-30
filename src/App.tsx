import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { Box, Container, Flex, Heading, Tabs } from "@radix-ui/themes";
import { useState } from "react";
import { Counter } from "./Counter";
import { CreateCounter } from "./CreateCounter";
import { TaskManager } from "./TaskManager";

function App() {
  const currentAccount = useCurrentAccount();
  const [counterId, setCounter] = useState(() => {
    const hash = window.location.hash.slice(1);
    return isValidSuiObjectId(hash) ? hash : null;
  });

  return (
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
          {currentAccount ? (
            <Tabs.Root defaultValue="tasks">
              <Tabs.List>
                <Tabs.Trigger value="tasks">Task Manager</Tabs.Trigger>
                <Tabs.Trigger value="counter">Counter Demo</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="tasks" style={{ marginTop: "1rem" }}>
                <TaskManager />
              </Tabs.Content>

              <Tabs.Content value="counter" style={{ marginTop: "1rem" }}>
                {counterId ? (
                  <Counter id={counterId} />
                ) : (
                  <CreateCounter
                    onCreated={(id) => {
                      window.location.hash = id;
                      setCounter(id);
                    }}
                  />
                )}
              </Tabs.Content>
            </Tabs.Root>
          ) : (
            <Heading>Please connect your wallet</Heading>
          )}
        </Container>
      </Container>
    </>
  );
}

export default App;
