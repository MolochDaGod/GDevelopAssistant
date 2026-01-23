import { useState, useEffect, useRef } from 'react';
import { getAIWorker } from '../../lib/aiWorkerClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function AIWorkerDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const worker = getAIWorker();

  useEffect(() => {
    if (isOpen && worker) {
      loadHealth();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadHealth = async () => {
    if (!worker) return;
    try {
      const healthData = await worker.getHealth();
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load health:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !worker || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await worker.chat(input);
      const aiMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!worker) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          aria-label="Open AI Assistant"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* Dashboard panel */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 z-50 w-96 h-[600px] shadow-2xl border-2 flex flex-col">
          <CardHeader className="flex-shrink-0 border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                    AI Developer Assistant
                  </span>
                  {health && (
                    <Badge variant="outline" className="text-xs">
                      {health.logsCount} logs
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Powered by Grok AI • Session: {worker.getSessionId().slice(0, 12)}...
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>

            {health && (
              <div className="flex gap-2 mt-3 text-xs">
                <Badge variant="secondary">
                  Errors: {health.errorsCount}
                </Badge>
                <Badge variant="secondary">
                  Uptime: {Math.floor(health.uptime / 1000)}s
                </Badge>
              </div>
            )}
          </CardHeader>

          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <p className="mb-4">👋 Hi! I'm your AI development assistant.</p>
                  <p className="mb-2">I'm monitoring your app and can help with:</p>
                  <ul className="text-left inline-block space-y-1">
                    <li>• Debugging errors</li>
                    <li>• Explaining console logs</li>
                    <li>• Code suggestions</li>
                    <li>• Performance insights</li>
                  </ul>
                  <p className="mt-4 text-xs">
                    Ask me anything about your application!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.role === 'user' ? 'text-blue-100' : 'text-muted-foreground'
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                        <div className="flex gap-1">
                          <span className="animate-bounce">●</span>
                          <span className="animate-bounce delay-100">●</span>
                          <span className="animate-bounce delay-200">●</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="flex-shrink-0 p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your app..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
