import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import { 
  User,
  Edit,
  Mail,
  Calendar,
  Crown,
  Shield,
  Camera,
  Save,
  Settings,
  Award,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react';
import type { User as UserType, UpdateUserProfileInput } from '../../../server/src/schema';

interface UserProfileProps {
  user: UserType | null;
  onUpdate: (updatedUser: UserType) => void;
}

export function UserProfile({ user, onUpdate }: UserProfileProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState<UpdateUserProfileInput>({});

  const startEdit = useCallback(() => {
    if (user) {
      setEditData({
        first_name: user.first_name,
        last_name: user.last_name,
        profile_picture_url: user.profile_picture_url
      });
      setIsEditDialogOpen(true);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsUpdating(true);
      const updatedUser = await trpc.updateUserProfile.mutate(editData);
      onUpdate(updatedUser);
      setIsEditDialogOpen(false);
      
      // Log activity
      await trpc.logActivity.mutate({
        action: 'Profile Updated',
        description: 'Updated user profile information',
        entityType: 'profile',
        entityId: user.id
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getAccountAge = () => {
    if (!user) return '';
    const now = new Date();
    const created = new Date(user.created_at);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  };

  const getBadges = () => {
    const badges = [];
    if (user) {
      // Add some example badges based on user data
      badges.push({ name: 'Solo Boss', icon: Crown, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' });
      badges.push({ name: 'Early Adopter', icon: Zap, color: 'bg-purple-100 text-purple-700 border-purple-200' });
      badges.push({ name: 'Verified', icon: Shield, color: 'bg-blue-100 text-blue-700 border-blue-200' });
    }
    return badges;
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Profile</h2>
            <p className="text-gray-600 mt-1">Loading your profile...</p>
          </div>
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Profile 👤</h2>
          <p className="text-gray-600 mt-1">Manage your SoloBoss empire settings</p>
        </div>
        <Button onClick={startEdit} className="bg-purple-600 hover:bg-purple-700">
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-8">
          <div className="flex items-start space-x-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.profile_picture_url || ''} />
                <AvatarFallback className="text-2xl bg-purple-100">
                  {user.first_name[0]}{user.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                onClick={startEdit}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h1>
                <p className="text-purple-600 font-medium">Solo Entrepreneur</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {getBadges().map((badge, index) => {
                  const IconComponent = badge.icon;
                  return (
                    <Badge key={index} className={badge.color}>
                      <IconComponent className="h-3 w-3 mr-1" />
                      {badge.name}
                    </Badge>
                  );
                })}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Member for {getAccountAge()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-600" />
              <span>Account Details</span>
            </CardTitle>
            <CardDescription>Your basic account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Full Name</Label>
              <p className="text-gray-900">{user.first_name} {user.last_name}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-sm font-medium text-gray-700">Email Address</Label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-sm font-medium text-gray-700">Account Created</Label>
              <p className="text-gray-900">{user.created_at.toLocaleDateString()}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-sm font-medium text-gray-700">Last Updated</Label>
              <p className="text-gray-900">{user.updated_at.toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-purple-600" />
              <span>Achievements</span>
            </CardTitle>
            <CardDescription>Your SoloBoss milestones and accomplishments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">Empire Founder</span>
              </div>
              <Badge className="bg-yellow-100 text-yellow-700">Unlocked</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <span className="font-medium">AI Collaborator</span>
              </div>
              <Badge className="bg-purple-100 text-purple-700">Unlocked</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Verified Member</span>
              </div>
              <Badge className="bg-blue-100 text-blue-700">Unlocked</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-50">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-gray-400" />
                <span className="font-medium">Task Master</span>
              </div>
              <Badge variant="outline">Complete 100 tasks</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-purple-600" />
            <span>Quick Actions</span>
          </CardTitle>
          <CardDescription>Manage your account and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Edit className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Edit Profile</div>
                <div className="text-xs text-gray-500">Update info</div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Shield className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Privacy</div>
                <div className="text-xs text-gray-500">Security settings</div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Mail className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Notifications</div>
                <div className="text-xs text-gray-500">Email preferences</div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <TrendingUp className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Analytics</div>
                <div className="text-xs text-gray-500">View insights</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information and preferences
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={editData.first_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditData((prev) => ({ ...prev, first_name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={editData.last_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditData((prev) => ({ ...prev, last_name: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="profile_picture_url">Profile Picture URL</Label>
                <Input
                  id="profile_picture_url"
                  type="url"
                  value={editData.profile_picture_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditData((prev) => ({ 
                      ...prev, 
                      profile_picture_url: e.target.value || null 
                    }))
                  }
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Security Note</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Your email address cannot be changed here. Contact support if you need to update your email.
                </p>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button 
                type="submit" 
                disabled={isUpdating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}