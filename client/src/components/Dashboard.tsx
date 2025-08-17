import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { 
  TrendingUp, 
  CheckSquare, 
  Clock, 
  FileText, 
  Activity,
  Target,
  Calendar,
  Zap,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import type { DashboardStats, ActivityLog } from '../../../server/src/schema';

interface DashboardProps {
  stats: DashboardStats | null;
  onRefresh: () => Promise<void>;
}

export function Dashboard({ stats, onRefresh }: DashboardProps) {
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRecentActivity = useCallback(async () => {
    try {
      const activity = await trpc.getRecentActivity.query({ limit: 5 });
      setRecentActivity(activity);
    } catch (error) {
      console.error('Failed to load recent activity:', error);
    }
  }, []);

  useEffect(() => {
    loadRecentActivity();
  }, [loadRecentActivity]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([onRefresh(), loadRecentActivity()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const calculateProgress = () => {
    if (!stats || stats.total_tasks === 0) return 0;
    return Math.round((stats.completed_tasks / stats.total_tasks) * 100);
  };

  const getActivityIcon = (entityType: string | null) => {
    switch (entityType) {
      case 'task': return <CheckSquare className="h-4 w-4 text-green-600" />;
      case 'document': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'chat': return <Zap className="h-4 w-4 text-purple-600" />;
      case 'profile': return <Target className="h-4 w-4 text-orange-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome to BossRoom 👑</h2>
            <p className="text-gray-600 mt-1">Your command center awaits...</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome to BossRoom 👑</h2>
          <p className="text-gray-600 mt-1">Your empire at a glance - manage, track, and conquer!</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Tasks</p>
                <h3 className="text-3xl font-bold">{stats.total_tasks}</h3>
                <p className="text-purple-100 text-sm">Your empire's scope</p>
              </div>
              <CheckSquare className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Completed</p>
                <h3 className="text-3xl font-bold">{stats.completed_tasks}</h3>
                <p className="text-green-100 text-sm">Victories achieved</p>
              </div>
              <Target className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">In Progress</p>
                <h3 className="text-3xl font-bold">{stats.pending_tasks}</h3>
                <p className="text-orange-100 text-sm">Active battles</p>
              </div>
              <Clock className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Documents</p>
                <h3 className="text-3xl font-bold">{stats.total_documents}</h3>
                <p className="text-blue-100 text-sm">Knowledge arsenal</p>
              </div>
              <FileText className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span>Progress Overview</span>
            </CardTitle>
            <CardDescription>Your productivity metrics and achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Task Completion Rate</span>
                <span className="text-sm font-semibold text-purple-600">{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {stats.completed_tasks} of {stats.total_tasks} tasks completed
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{stats.completed_tasks}</div>
                <div className="text-sm text-green-600">Completed</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">{stats.pending_tasks}</div>
                <div className="text-sm text-orange-600">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Your latest accomplishments and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-6">
                <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400">Start creating tasks or documents to see activity here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.entity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <span>Quick Actions</span>
          </CardTitle>
          <CardDescription>Jump-start your productivity with these shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button className="h-auto p-4 flex-col space-y-2 bg-purple-600 hover:bg-purple-700">
              <CheckSquare className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Create Task</div>
                <div className="text-xs opacity-90">Add new mission</div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <FileText className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Upload Document</div>
                <div className="text-xs opacity-70">Expand your arsenal</div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Zap className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Chat with AI</div>
                <div className="text-xs opacity-70">Get expert advice</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}