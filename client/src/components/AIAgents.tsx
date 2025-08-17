import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import { 
  Bot,
  MessageSquare,
  Send,
  Sparkles,
  Brain,
  Users,
  Lightbulb,
  TrendingUp,
  Shield,
  Target,
  Briefcase,
  Heart,
  Zap
} from 'lucide-react';
import type { AIAgent, ChatMessage, SendMessageInput } from '../../../server/src/schema';

export function AIAgents() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getAIAgents.query();
      setAgents(result);
    } catch (error) {
      console.error('Failed to load AI agents:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadChatHistory = useCallback(async (agentId: string) => {
    try {
      const history = await trpc.getChatHistory.query({ agentId, limit: 50 });
      setChatHistory(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (selectedAgent) {
      loadChatHistory(selectedAgent.id);
    }
  }, [selectedAgent, loadChatHistory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !newMessage.trim()) return;

    const messageData: SendMessageInput = {
      agent_id: selectedAgent.id,
      message: newMessage.trim()
    };

    try {
      setIsSending(true);
      const response = await trpc.sendMessage.mutate(messageData);
      
      // Add the new messages to chat history
      setChatHistory((prev: ChatMessage[]) => [...prev, response]);
      setNewMessage('');
      
      // Log activity
      await trpc.logActivity.mutate({
        action: 'AI Chat',
        description: `Chatted with ${selectedAgent.name}`,
        entityType: 'chat',
        entityId: response.id
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const getAgentIcon = (specialization: string) => {
    const spec = specialization.toLowerCase();
    if (spec.includes('marketing')) return <TrendingUp className="h-6 w-6" />;
    if (spec.includes('finance')) return <Target className="h-6 w-6" />;
    if (spec.includes('strategy')) return <Brain className="h-6 w-6" />;
    if (spec.includes('legal')) return <Shield className="h-6 w-6" />;
    if (spec.includes('operations')) return <Briefcase className="h-6 w-6" />;
    if (spec.includes('hr') || spec.includes('human')) return <Users className="h-6 w-6" />;
    if (spec.includes('creative')) return <Lightbulb className="h-6 w-6" />;
    if (spec.includes('wellness')) return <Heart className="h-6 w-6" />;
    return <Bot className="h-6 w-6" />;
  };

  const getSpecializationColor = (specialization: string) => {
    const spec = specialization.toLowerCase();
    if (spec.includes('marketing')) return 'bg-pink-100 text-pink-700 border-pink-200';
    if (spec.includes('finance')) return 'bg-green-100 text-green-700 border-green-200';
    if (spec.includes('strategy')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (spec.includes('legal')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (spec.includes('operations')) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (spec.includes('hr') || spec.includes('human')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (spec.includes('creative')) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (spec.includes('wellness')) return 'bg-rose-100 text-rose-700 border-rose-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">AI Team 🤖</h2>
          <p className="text-gray-600 mt-1">Your virtual business experts ready to help you conquer</p>
        </div>
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">
            {agents.filter(agent => agent.is_active).length} Active Agents
          </span>
        </div>
      </div>

      {/* Agents Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 w-16 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI agents available</h3>
            <p className="text-gray-500">Your virtual team is getting ready. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent: AIAgent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-all duration-200 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={agent.avatar_url || ''} />
                      <AvatarFallback className="bg-purple-100">
                        {getAgentIcon(agent.specialization)}
                      </AvatarFallback>
                    </Avatar>
                    {agent.is_active && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900">{agent.name}</h3>
                    <Badge className={`mt-1 ${getSpecializationColor(agent.specialization)}`}>
                      {agent.specialization}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                      {agent.description}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Member since {agent.created_at.toLocaleDateString()}
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => setSelectedAgent(agent)}
                        disabled={!agent.is_active}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[600px] flex flex-col">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={agent.avatar_url || ''} />
                            <AvatarFallback className="bg-purple-100">
                              {getAgentIcon(agent.specialization)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-xl">{agent.name}</span>
                            <Badge className={`ml-2 ${getSpecializationColor(agent.specialization)}`}>
                              {agent.specialization}
                            </Badge>
                          </div>
                        </DialogTitle>
                        <DialogDescription>
                          {agent.description}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Chat Area */}
                      <div className="flex-1 flex flex-col min-h-0">
                        <ScrollArea className="flex-1 p-4 border rounded-lg">
                          {chatHistory.length === 0 ? (
                            <div className="text-center py-8">
                              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500">No messages yet</p>
                              <p className="text-sm text-gray-400">Start a conversation with {agent.name}</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {chatHistory.map((message: ChatMessage) => (
                                <div key={message.id}>
                                  {message.is_user_message ? (
                                    // User message
                                    <div className="flex justify-end">
                                      <div className="bg-purple-600 text-white p-3 rounded-lg max-w-xs lg:max-w-md">
                                        <p className="text-sm">{message.message}</p>
                                        <p className="text-xs opacity-75 mt-1">
                                          {formatMessageTime(message.created_at)}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    // Agent response
                                    <div className="flex justify-start">
                                      <div className="flex space-x-2">
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={agent.avatar_url || ''} />
                                          <AvatarFallback className="bg-purple-100 text-xs">
                                            {getAgentIcon(agent.specialization)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="bg-gray-100 p-3 rounded-lg max-w-xs lg:max-w-md">
                                          <p className="text-sm">{message.response || 'Processing...'}</p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {formatMessageTime(message.created_at)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                        
                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className="mt-4 flex space-x-2">
                          <Input
                            value={newMessage}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                            placeholder={`Ask ${agent.name} anything...`}
                            disabled={isSending}
                            className="flex-1"
                          />
                          <Button 
                            type="submit" 
                            disabled={isSending || !newMessage.trim()}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {isSending ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </form>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <span>Quick AI Assistance</span>
          </CardTitle>
          <CardDescription>Get instant help from your virtual team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex-col space-y-2 hover:bg-purple-50"
            >
              <TrendingUp className="h-5 w-5 text-pink-600" />
              <div className="text-center">
                <div className="font-medium">Marketing Strategy</div>
                <div className="text-xs text-gray-500">Growth & promotion</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex-col space-y-2 hover:bg-green-50"
            >
              <Target className="h-5 w-5 text-green-600" />
              <div className="text-center">
                <div className="font-medium">Financial Planning</div>
                <div className="text-xs text-gray-500">Budgets & forecasts</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex-col space-y-2 hover:bg-blue-50"
            >
              <Shield className="h-5 w-5 text-blue-600" />
              <div className="text-center">
                <div className="font-medium">Legal Advice</div>
                <div className="text-xs text-gray-500">Contracts & compliance</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex-col space-y-2 hover:bg-purple-50"
            >
              <Brain className="h-5 w-5 text-purple-600" />
              <div className="text-center">
                <div className="font-medium">Strategy Session</div>
                <div className="text-xs text-gray-500">Business planning</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {agents.filter(agent => agent.is_active).length}
            </div>
            <p className="text-sm text-gray-500">Active Team Members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {chatHistory.length}
            </div>
            <p className="text-sm text-gray-500">Total Conversations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {new Set(agents.map(agent => agent.specialization)).size}
            </div>
            <p className="text-sm text-gray-500">Specializations</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}