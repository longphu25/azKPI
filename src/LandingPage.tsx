import { 
  Box, 
  Container, 
  Flex, 
  Text, 
  Heading, 
  Button, 
  Card, 
  Grid,
  Badge,
  Separator
} from "@radix-ui/themes";
import { ConnectButton } from "@mysten/dapp-kit";
import { 
  Shield, 
  Database, 
  Users, 
  Lock, 
  CheckCircle, 
  FileText, 
  Globe, 
  Zap,
  Star,
  Target,
  TrendingUp
} from "lucide-react";
import "./landing.css";

export function LandingPage() {
  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Blockchain Security",
      description: "Immutable task records on Sui blockchain with tamper-proof audit trails"
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: "Decentralized Storage",
      description: "Files stored on Walrus with Seal encryption for maximum privacy"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Collaborative Workflow",
      description: "Share tasks securely with team members using wallet addresses"
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "End-to-End Encryption",
      description: "Content encrypted client-side before storage, only you control access"
    }
  ];

  const benefits = [
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "No Single Point of Failure",
      description: "Decentralized architecture ensures your data is always accessible"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Global Accessibility",
      description: "Access your tasks from anywhere with just your wallet"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Sub-2 second transaction finality on Sui blockchain"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Privacy First",
      description: "Your data remains encrypted and private by default"
    }
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Connect Wallet",
      description: "Connect your Sui wallet to authenticate and start managing tasks"
    },
    {
      step: "02", 
      title: "Create Tasks",
      description: "Create tasks with rich content, files, and encrypted attachments"
    },
    {
      step: "03",
      title: "Share Securely",
      description: "Share tasks with specific wallet addresses using on-chain permissions"
    },
    {
      step: "04",
      title: "Track Progress",
      description: "Monitor task completion with immutable blockchain records"
    }
  ];

  return (
    <Box style={{ 
      background: "linear-gradient(135deg, hsl(var(--blue-1)) 0%, hsl(var(--blue-2)) 100%)",
      minHeight: "100vh"
    }}>
      {/* Hero Section */}
      <Container size="4" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
        <Flex direction="column" align="center" gap="6" style={{ textAlign: "center" }} className="landing-hero">
          <Badge size="2" variant="soft" color="blue">
            Powered by Sui • Walrus • Seal
          </Badge>
          
          <Heading size="9" style={{ 
            maxWidth: "800px",
            lineHeight: "1.1",
            color: "hsl(var(--blue-12))",
            fontWeight: "bold",
            textAlign: "center"
          }}>
            The Future of Decentralized Task Management
          </Heading>
          
          <Text size="5" style={{ 
            maxWidth: "600px", 
            lineHeight: "1.6",
            color: "hsl(var(--blue-11))"
          }}>
            azKPI empowers teams with blockchain-secured workflows, encrypted file storage, 
            and transparent collaboration—all without compromising privacy or control.
          </Text>
          
          <Flex gap="4" align="center" wrap="wrap" justify="center">
            <ConnectButton />
            <Button variant="outline" size="3">
              <FileText className="w-4 h-4" />
              Learn More
            </Button>
          </Flex>

          <Flex gap="6" align="center" wrap="wrap" justify="center" style={{ marginTop: "2rem" }}>
            <Flex align="center" gap="2">
              <Star className="w-5 h-5" style={{ color: "#facc15" }} />
              <Text size="3" weight="medium" style={{ color: "hsl(var(--blue-11))" }}>99.95% Uptime</Text>
            </Flex>
            <Flex align="center" gap="2">
              <Shield className="w-5 h-5" style={{ color: "#10b981" }} />
              <Text size="3" weight="medium" style={{ color: "hsl(var(--blue-11))" }}>Enterprise Security</Text>
            </Flex>
            <Flex align="center" gap="2">
              <TrendingUp className="w-5 h-5" style={{ color: "#3b82f6" }} />
              <Text size="3" weight="medium" style={{ color: "hsl(var(--blue-11))" }}>Sub-2s Performance</Text>
            </Flex>
          </Flex>
        </Flex>
      </Container>

      {/* Features Section */}
      <Container size="4" style={{ paddingBottom: "4rem" }}>
        <Card style={{ 
          padding: "3rem", 
          background: "hsl(var(--blue-2))", 
          border: "1px solid hsl(var(--blue-6))"
        }}>
          <Flex direction="column" gap="6">
            <Flex direction="column" align="center" gap="3" style={{ textAlign: "center" }}>
              <Heading size="7" style={{ color: "hsl(var(--blue-12))" }}>Core Features</Heading>
              <Text size="4" style={{ 
                maxWidth: "600px",
                color: "hsl(var(--blue-11))"
              }}>
                Built on cutting-edge Web3 infrastructure for maximum security, 
                performance, and user control
              </Text>
            </Flex>

            <Grid columns={{ initial: "1", sm: "2", lg: "4" }} gap="4">
              {features.map((feature, index) => (
                <Card key={index} className="landing-feature-card" style={{ 
                  padding: "2rem", 
                  textAlign: "center", 
                  height: "100%",
                  background: "hsl(var(--blue-3))",
                  border: "1px solid hsl(var(--blue-6))"
                }}>
                  <Flex direction="column" align="center" gap="3">
                    <Box className="landing-feature-icon" style={{ 
                      color: "hsl(var(--blue-12))",
                      padding: "1rem",
                      borderRadius: "12px",
                      background: "hsl(var(--blue-4))"
                    }}>
                      {feature.icon}
                    </Box>
                    <Heading size="4" style={{ color: "hsl(var(--blue-12))" }}>{feature.title}</Heading>
                    <Text size="3" style={{ 
                      lineHeight: "1.5",
                      color: "hsl(var(--blue-11))"
                    }}>
                      {feature.description}
                    </Text>
                  </Flex>
                </Card>
              ))}
            </Grid>
          </Flex>
        </Card>
      </Container>

      {/* Benefits Section */}
      <Container size="4" style={{ paddingBottom: "4rem" }}>
        <Flex direction="column" gap="6">
          <Flex direction="column" align="center" gap="3" style={{ textAlign: "center" }}>
            <Heading size="7" style={{ color: "hsl(var(--blue-12))" }}>Why Choose azKPI?</Heading>
            <Text size="4" style={{ 
              color: "hsl(var(--blue-11))", 
              maxWidth: "600px" 
            }}>
              Experience the benefits of truly decentralized task management
            </Text>
          </Flex>

          <Grid columns={{ initial: "1", sm: "2" }} gap="4">
            {benefits.map((benefit, index) => (
              <Card key={index} className="landing-benefit-card" style={{ 
                padding: "2rem", 
                background: "hsl(var(--blue-3))", 
                border: "1px solid hsl(var(--blue-6))"
              }}>
                <Flex gap="4" align="start">
                  <Box style={{ 
                    color: "hsl(var(--blue-11))",
                    padding: "0.5rem",
                    borderRadius: "8px",
                    background: "hsl(var(--blue-4))"
                  }}>
                    {benefit.icon}
                  </Box>
                  <Flex direction="column" gap="2">
                    <Heading size="4" style={{ color: "hsl(var(--blue-12))" }}>{benefit.title}</Heading>
                    <Text size="3" style={{ 
                      color: "hsl(var(--blue-11))", 
                      lineHeight: "1.5" 
                    }}>
                      {benefit.description}
                    </Text>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Grid>
        </Flex>
      </Container>

      {/* How It Works Section */}
      <Container size="4" style={{ paddingBottom: "4rem" }}>
        <Card style={{ 
          padding: "3rem", 
          background: "hsl(var(--blue-2))", 
          border: "1px solid hsl(var(--blue-6))"
        }}>
          <Flex direction="column" gap="6">
            <Flex direction="column" align="center" gap="3" style={{ textAlign: "center" }}>
              <Heading size="7" style={{ color: "hsl(var(--blue-12))" }}>How It Works</Heading>
              <Text size="4" style={{ 
                maxWidth: "600px",
                color: "hsl(var(--blue-11))"
              }}>
                Get started with azKPI in just four simple steps
              </Text>
            </Flex>

            <Grid columns={{ initial: "1", sm: "2", lg: "4" }} gap="4">
              {howItWorks.map((step, index) => (
                <Flex key={index} className="landing-step" direction="column" align="center" gap="4" style={{ textAlign: "center" }}>
                  <Flex align="center" justify="center" style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, hsl(var(--blue-9)) 0%, hsl(var(--purple-9)) 100%)",
                    color: "white",
                    fontSize: "18px",
                    fontWeight: "bold"
                  }}>
                    {step.step}
                  </Flex>
                  <Flex direction="column" gap="2">
                    <Heading size="4" style={{ color: "hsl(var(--blue-12))" }}>{step.title}</Heading>
                    <Text size="3" style={{ 
                      lineHeight: "1.5",
                      color: "hsl(var(--blue-11))"
                    }}>
                      {step.description}
                    </Text>
                  </Flex>
                </Flex>
              ))}
            </Grid>
          </Flex>
        </Card>
      </Container>

      {/* Technical Stack Section */}
      <Container size="4" style={{ paddingBottom: "4rem" }}>
        <Flex direction="column" gap="6">
          <Flex direction="column" align="center" gap="3" style={{ textAlign: "center" }}>
            <Heading size="7" style={{ color: "hsl(var(--blue-12))" }}>Built on Best-in-Class Technology</Heading>
            <Text size="4" style={{ 
              color: "hsl(var(--blue-11))", 
              maxWidth: "600px" 
            }}>
              Leveraging the most advanced Web3 infrastructure for enterprise-grade performance
            </Text>
          </Flex>

          <Grid columns={{ initial: "1", sm: "3" }} gap="4">
            <Card className="landing-tech-card" style={{ 
              padding: "2rem", 
              background: "hsl(var(--blue-3))", 
              border: "1px solid hsl(var(--blue-6))",
              textAlign: "center"
            }}>
              <Flex direction="column" gap="3" align="center">
                <Box style={{ 
                  fontSize: "2rem", 
                  fontWeight: "bold", 
                  color: "hsl(var(--blue-11))" 
                }}>
                  SUI
                </Box>
                <Heading size="4" style={{ color: "hsl(var(--blue-12))" }}>Sui Blockchain</Heading>
                <Text size="3" style={{ color: "hsl(var(--blue-11))" }}>
                  Ultra-fast, secure smart contracts with parallel execution
                </Text>
              </Flex>
            </Card>

            <Card className="landing-tech-card" style={{ 
              padding: "2rem", 
              background: "hsl(var(--blue-3))", 
              border: "1px solid hsl(var(--blue-6))",
              textAlign: "center"
            }}>
              <Flex direction="column" gap="3" align="center">
                <Box style={{ 
                  fontSize: "2rem", 
                  fontWeight: "bold", 
                  color: "hsl(var(--purple-11))" 
                }}>
                  🦭
                </Box>
                <Heading size="4" style={{ color: "hsl(var(--blue-12))" }}>Walrus Storage</Heading>
                <Text size="3" style={{ color: "hsl(var(--blue-11))" }}>
                  Decentralized, redundant file storage with global accessibility
                </Text>
              </Flex>
            </Card>

            <Card className="landing-tech-card" style={{ 
              padding: "2rem", 
              background: "hsl(var(--blue-3))", 
              border: "1px solid hsl(var(--blue-6))",
              textAlign: "center"
            }}>
              <Flex direction="column" gap="3" align="center">
                <Box style={{ 
                  fontSize: "2rem", 
                  fontWeight: "bold", 
                  color: "hsl(var(--green-11))" 
                }}>
                  🔐
                </Box>
                <Heading size="4" style={{ color: "hsl(var(--blue-12))" }}>Seal Encryption</Heading>
                <Text size="3" style={{ color: "hsl(var(--blue-11))" }}>
                  Post-quantum encryption for maximum data security
                </Text>
              </Flex>
            </Card>
          </Grid>
        </Flex>
      </Container>

      {/* Call to Action */}
      <Container size="4" style={{ paddingBottom: "4rem" }}>
        <Card style={{ 
          padding: "4rem", 
          background: "linear-gradient(135deg, hsl(var(--blue-9)) 0%, hsl(var(--blue-10)) 100%)",
          textAlign: "center",
          border: "1px solid hsl(var(--blue-7))"
        }}>
          <Flex direction="column" align="center" gap="6">
            <Flex direction="column" gap="3">
              <Heading size="8" style={{ color: "white" }}>
                Ready to Revolutionize Your Workflow?
              </Heading>
              <Text size="5" style={{ color: "rgba(255, 255, 255, 0.9)", maxWidth: "600px" }}>
                Join the future of decentralized task management. Secure, private, and completely under your control.
              </Text>
            </Flex>

            <Flex gap="4" align="center" wrap="wrap" justify="center">
              <ConnectButton />
              <Button variant="outline" size="3" style={{ 
                background: "rgba(255, 255, 255, 0.1)", 
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "white"
              }}>
                <FileText className="w-4 h-4" />
                View Documentation
              </Button>
            </Flex>

            <Separator style={{ width: "100%", background: "rgba(255, 255, 255, 0.2)" }} />

            <Flex direction="column" gap="2" style={{ textAlign: "center" }}>
              <Text size="2" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                Trusted by organizations worldwide • Enterprise-grade security • 24/7 support
              </Text>
            </Flex>
          </Flex>
        </Card>
      </Container>
    </Box>
  );
}
