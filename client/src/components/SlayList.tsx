import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { 
  Plus,
  CheckSquare,
  Clock,
  AlertCircle,
  Calendar,
  Trash2,
  Edit,
  Filter,
  Target,
  Flame
} from 'lucide-react';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../../../server/src/schema';

export function SlayList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  const [newTask, setNewTask] = useState<CreateTaskInput>({
    title: '',
    description: null,
    priority: 'medium',
    due_date: null
  });

  const [editTask, setEditTask] = useState<Partial<UpdateTaskInput>>({});

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getTasks.query();
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const createdTask = await trpc.createTask.mutate(newTask);
      setTasks((prev: Task[]) => [...prev, createdTask]);
      setNewTask({
        title: '',
        description: null,
        priority: 'medium',
        due_date: null
      });
      setIsCreateDialogOpen(false);
      
      // Log activity
      await trpc.logActivity.mutate({
        action: 'Task Created',
        description: `Created new task: ${createdTask.title}`,
        entityType: 'task',
        entityId: createdTask.id
      });
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTask.id) return;

    try {
      const updatedTask = await trpc.updateTask.mutate(editTask as UpdateTaskInput);
      setTasks((prev: Task[]) => 
        prev.map((task: Task) => task.id === updatedTask.id ? updatedTask : task)
      );
      setEditingTask(null);
      setEditTask({});
      
      // Log activity
      await trpc.logActivity.mutate({
        action: 'Task Updated',
        description: `Updated task: ${updatedTask.title}`,
        entityType: 'task',
        entityId: updatedTask.id
      });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await trpc.deleteTask.mutate({ taskId });
      setTasks((prev: Task[]) => prev.filter((task: Task) => task.id !== taskId));
      
      // Log activity
      await trpc.logActivity.mutate({
        action: 'Task Deleted',
        description: 'Deleted a task',
        entityType: 'task',
        entityId: taskId
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleStatusChange = async (taskId: string, status: 'pending' | 'in_progress' | 'completed') => {
    try {
      const updatedTask = await trpc.updateTask.mutate({ id: taskId, status });
      setTasks((prev: Task[]) => 
        prev.map((task: Task) => task.id === taskId ? updatedTask : task)
      );
      
      // Log activity
      await trpc.logActivity.mutate({
        action: `Task ${status.replace('_', ' ')}`,
        description: `Marked task as ${status.replace('_', ' ')}: ${updatedTask.title}`,
        entityType: 'task',
        entityId: taskId
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Flame className="h-4 w-4 text-red-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Target className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredTasks = tasks.filter((task: Task) => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setEditTask({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toISOString().split('T')[0];
  };

  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    return new Date(dateString);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">SlayList Generator ⚔️</h2>
          <p className="text-gray-600 mt-1">Conquer your goals one task at a time</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Mission
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Mission</DialogTitle>
              <DialogDescription>
                Define your next conquest and set it in motion
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Mission Title *</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewTask((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="What needs to be conquered?"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Battle Plan</Label>
                  <Textarea
                    id="description"
                    value={newTask.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNewTask((prev: CreateTaskInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                    placeholder="Describe your strategy..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') =>
                        setNewTask((prev: CreateTaskInput) => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🎯 Low Priority</SelectItem>
                        <SelectItem value="medium">⚠️ Medium Priority</SelectItem>
                        <SelectItem value="high">🔥 High Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="due_date">Deadline</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formatDate(newTask.due_date) || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewTask((prev: CreateTaskInput) => ({ 
                          ...prev, 
                          due_date: parseDate(e.target.value) 
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Launch Mission
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <div className="flex space-x-2">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
              className={filter === status ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              {status === 'all' ? 'All Tasks' : status.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'No missions yet' : `No ${filter.replace('_', ' ')} missions`}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'Create your first mission to start conquering your goals!'
                : `Switch filters to see missions in other states.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map((task: Task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                      <div className="flex items-center space-x-2">
                        {getPriorityIcon(task.priority)}
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority} priority
                        </Badge>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-600">{task.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Created {task.created_at.toLocaleDateString()}</span>
                      </div>
                      {task.due_date && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Due {task.due_date.toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Select
                      value={task.status}
                      onValueChange={(value: 'pending' | 'in_progress' | 'completed') =>
                        handleStatusChange(task.id, value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(task)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={editingTask !== null} onOpenChange={() => setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mission</DialogTitle>
            <DialogDescription>Update your mission details</DialogDescription>
          </DialogHeader>
          {editingTask && (
            <form onSubmit={handleUpdateTask}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Mission Title *</Label>
                  <Input
                    id="edit-title"
                    value={editTask.title || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditTask((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Battle Plan</Label>
                  <Textarea
                    id="edit-description"
                    value={editTask.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditTask((prev) => ({ ...prev, description: e.target.value || null }))
                    }
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-priority">Priority</Label>
                    <Select
                      value={editTask.priority || 'medium'}
                      onValueChange={(value: 'low' | 'medium' | 'high') =>
                        setEditTask((prev) => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={editTask.status || 'pending'}
                      onValueChange={(value: 'pending' | 'in_progress' | 'completed') =>
                        setEditTask((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-due_date">Deadline</Label>
                    <Input
                      id="edit-due_date"
                      type="date"
                      value={formatDate(editTask.due_date || null) || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditTask((prev) => ({ ...prev, due_date: parseDate(e.target.value) }))
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Update Mission
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}