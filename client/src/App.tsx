import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  CheckSquare, 
  FileText, 
  Bot, 
  User, 
  Activity, 
  TrendingUp,
  Calendar,
  Clock,
  Target,
  Briefcase,
  Zap
} from 'lucide-react';

// Import components
import { Dashboard } from '@/components/Dashboard';
import { SlayList } from '@/components/SlayList';
import { BriefcaseView } from '@/components/BriefcaseView';
import { AIAgents } from '@/components/AIAgents';
import { UserProfile } from '@/components/UserProfile';

// Import types
import type { 
  DashboardStats,
  Task,
  Document,
  AIAgent,
  User as UserType,
  ActivityLog
} from '../../server/src/schema';

function App() {
  const [activeTab, setActiveTab] = useState('bossroom');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [stats, profile] = await Promise.all([
        trpc.getDashboardStats.query(),
        trpc.getUserProfile.query()
      ]);
      setDashboardStats(stats);
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'bossroom': return <Crown className="h-4 w-4" />;
      case 'slaylist': return <CheckSquare className="h-4 w-4" />;
      case 'briefcase': return <Briefcase className="h-4 w-4" />;
      case 'ai-agents': return <Bot className="h-4 w-4" />;
      case 'profile': return <User className="h-4 w-4" />;
      default: return null;
    }
  };

  const calculateCompletionRate = () => {
    if (!dashboardStats || dashboardStats.total_tasks === 0) return 0;
    return Math.round((dashboardStats.completed_tasks / dashboardStats.total_tasks) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-purple-600 font-medium">Loading your SoloBoss AI workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  SoloBoss AI
                </h1>
                <p className="text-sm text-gray-500">Your Virtual Business Empire</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {dashboardStats && (
                <div className="hidden md:flex items-center space-x-4">
                  <Card className="p-3">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      <div className="text-sm">
                        <span className="font-semibold">{calculateCompletionRate()}%</span>
                        <span className="text-gray-500 ml-1">Complete</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
              
              {userProfile && (
                <div className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarImage src={userProfile.profile_picture_url || ''} />
                    <AvatarFallback>
                      {userProfile.first_name[0]}{userProfile.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium">
                      {userProfile.first_name} {userProfile.last_name}
                    </p>
                    <p className="text-xs text-gray-500">Solo Entrepreneur</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-md">
            <TabsTrigger 
              value="bossroom" 
              className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              {getTabIcon('bossroom')}
              <span>BossRoom</span>
            </TabsTrigger>
            <TabsTrigger 
              value="slaylist" 
              className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              {getTabIcon('slaylist')}
              <span>SlayList</span>
            </TabsTrigger>
            <TabsTrigger 
              value="briefcase" 
              className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              {getTabIcon('briefcase')}
              <span>Briefcase</span>
            </TabsTrigger>
            <TabsTrigger 
              value="ai-agents" 
              className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              {getTabIcon('ai-agents')}
              <span>AI Team</span>
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              {getTabIcon('profile')}
              <span>Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bossroom" className="space-y-6">
            <Dashboard 
              stats={dashboardStats} 
              onRefresh={loadInitialData}
            />
          </TabsContent>

          <TabsContent value="slaylist" className="space-y-6">
            <SlayList />
          </TabsContent>

          <TabsContent value="briefcase" className="space-y-6">
            <BriefcaseView />
          </TabsContent>

          <TabsContent value="ai-agents" className="space-y-6">
            <AIAgents />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <UserProfile 
              user={userProfile} 
              onUpdate={(updatedProfile) => setUserProfile(updatedProfile)}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Quick Stats Footer */}
      {dashboardStats && (
        <footer className="bg-white/80 backdrop-blur-md border-t border-purple-100 mt-8">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-center items-center space-x-8 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <span>{dashboardStats.completed_tasks} tasks completed</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>{dashboardStats.total_documents} documents</span>
              </div>
              <div className="flex items-center space-x-1">
                <Activity className="h-4 w-4 text-purple-600" />
                <span>{dashboardStats.recent_activity_count} recent activities</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;