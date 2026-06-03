import { useEffect, useState, useRef } from 'react';
import { useToast } from '../components/Toast';
import { getProfile, updateProfile, changePassword, uploadAvatar } from '../api';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Select } from '../components/ui/Select';
import { User, Phone, Mail, Award, Compass, Sparkles, Key, Camera, Loader2, Edit3, Check, X } from 'lucide-react';

const PURPOSE_OPTIONS = [
  { value: 'personal', label: 'Personal Project Management' },
  { value: 'team', label: 'Team Collaboration & Operations' },
  { value: 'client', label: 'Client Work & Deliverables' }
];

const PROFESSION_OPTIONS = [
  { value: 'developer', label: 'Developer / Engineer' },
  { value: 'manager', label: 'Product / Project Manager' },
  { value: 'designer', label: 'Designer / Creator' },
  { value: 'marketing', label: 'Marketing Specialist' },
  { value: 'other', label: 'Other Profession' }
];

const DOMAIN_OPTIONS = [
  { value: 'tech', label: 'Technology & IT' },
  { value: 'marketing', label: 'Marketing & Ad Agency' },
  { value: 'finance', label: 'Finance & Consulting' },
  { value: 'education', label: 'Education & Research' }
];

const TEAM_SIZE_OPTIONS = [
  { value: '1', label: 'Just Me (1)' },
  { value: 'small', label: 'Small Team (2-10)' },
  { value: 'medium', label: 'Medium Team (11-50)' },
  { value: 'large', label: 'Enterprise (50+)' }
];

export default function Profile() {
  const { user: storeUser, setUser: setStoreUser } = useStore();
  const [form, setForm] = useState({
    name: storeUser?.name || '',
    email: storeUser?.email || '',
    mobile: storeUser?.mobile || '',
    role: storeUser?.role || '',
    profileImage: storeUser?.profileImage || '',
    onboarding: null
  });

  // Password state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Onboarding edit state
  const [onboardingEdit, setOnboardingEdit] = useState({
    purpose: '',
    profession: '',
    domain: '',
    teamSize: ''
  });

  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditingOnboarding, setIsEditingOnboarding] = useState(false);

  const fileInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    getProfile()
      .then((res) => {
        if (!mounted) return;
        const p = res.data.user || {};
        const onboardingData = (p.onboardingCompleted || p.purpose) ? {
          purpose: p.purpose || '',
          profession: p.profession || '',
          domain: p.domain || '',
          teamSize: p.teamSize || ''
        } : null;

        setForm({
          name: p.name || '',
          email: p.email || '',
          mobile: p.mobile || '',
          role: p.role || '',
          profileImage: p.profileImage || '',
          onboarding: onboardingData
        });

        if (onboardingData) {
          setOnboardingEdit({
            purpose: onboardingData.purpose,
            profession: onboardingData.profession,
            domain: onboardingData.domain,
            teamSize: onboardingData.teamSize
          });
        }
      })
      .catch(() => {
        const onboarding = localStorage.getItem('ttm_onboarding');
        if (onboarding) setForm((prev) => ({ ...prev, onboarding: JSON.parse(onboarding) }));
      });
    return () => { mounted = false; };
  }, [storeUser?.profileImage]);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const handlePasswordChange = (key, value) => setPasswords((prev) => ({ ...prev, [key]: value }));
  const handleOnboardingChange = (key, value) => setOnboardingEdit((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.name.trim()) {
      toast('Name is required', 'error');
      return;
    }
    setSaving(true);
    updateProfile({ name: form.name, mobile: form.mobile })
      .then((res) => {
        toast('Profile updated successfully', 'success');
        setStoreUser(res.data.user);
      })
      .catch((err) => toast(err.response?.data?.error || 'Unable to save profile.', 'error'))
      .finally(() => setSaving(false));
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword) {
      toast('All password fields are required', 'info');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast('New password must be at least 6 characters long', 'warning');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast('New passwords do not match', 'error');
      return;
    }

    setPasswordSaving(true);
    changePassword({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword
    })
      .then(() => {
        toast('Password updated successfully', 'success');
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      })
      .catch((err) => toast(err.response?.data?.error || 'Failed to change password.', 'error'))
      .finally(() => setPasswordSaving(false));
  };

  const handleOnboardingSave = () => {
    setOnboardingSaving(true);
    updateProfile({
      purpose: onboardingEdit.purpose,
      profession: onboardingEdit.profession,
      domain: onboardingEdit.domain,
      teamSize: onboardingEdit.teamSize
    })
      .then((res) => {
        toast('Workspace setup updated successfully', 'success');
        setForm((prev) => ({
          ...prev,
          onboarding: {
            purpose: onboardingEdit.purpose,
            profession: onboardingEdit.profession,
            domain: onboardingEdit.domain,
            teamSize: onboardingEdit.teamSize
          }
        }));
        setStoreUser(res.data.user);
        setIsEditingOnboarding(false);
      })
      .catch((err) => toast(err.response?.data?.error || 'Failed to update preferences.', 'error'))
      .finally(() => setOnboardingSaving(false));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Only image files are allowed', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast('Image file must be less than 2MB', 'warning');
      return;
    }

    setUploading(true);
    uploadAvatar(file)
      .then((res) => {
        toast('Avatar picture updated', 'success');
        setForm((prev) => ({ ...prev, profileImage: res.data.user.profileImage }));
        setStoreUser(res.data.user);
      })
      .catch((err) => toast(err.response?.data?.error || 'Failed to upload photo.', 'error'))
      .finally(() => setUploading(false));
  };

  const getAvatarUrl = (profileImage) => {
    if (!profileImage) return null;
    if (profileImage.startsWith('http')) return profileImage;
    const apiBase = import.meta.env.VITE_API_URL || '';
    const host = apiBase.replace(/\/api$/, '');
    return `${host}${profileImage}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-1">User Settings</p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Account Details</h1>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Panel: Profile Editor & Password Update */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b border-gray-100 dark:border-dark-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User size={16} className="text-primary-500" />
                Personal Profile Info
              </CardTitle>
              <CardDescription>Update your personal info, contact details, and avatar image.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Avatar upload section */}
              <div className="flex items-center gap-6 p-4 rounded-xl bg-surface-50 dark:bg-dark-hover/30 border border-gray-100 dark:border-dark-border/40">
                <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
                  <Avatar
                    src={getAvatarUrl(form.profileImage)}
                    fallback={form.name?.charAt(0)?.toUpperCase()}
                    className="h-20 w-20 text-2xl ring-4 ring-white dark:ring-dark-card shadow-md transition-opacity group-hover:opacity-90"
                  />
                  {uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  ) : (
                    <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-dark-card group-hover:bg-primary-500 transition-colors">
                      <Camera size={12} />
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{form.name || 'Set your name'}</h3>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <Badge variant="default" className="text-[10px] px-2 py-0 capitalize">{form.role}</Badge>
                    <span className="text-xs text-surface-500 dark:text-surface-400">{form.email}</span>
                  </div>
                  <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-2">Allowed JPG, PNG or WEBP. Max size 2MB.</p>
                </div>
              </div>

              {/* Editor fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-1.5">
                    <User size={13} /> Full Name
                  </label>
                  <Input 
                    value={form.name} 
                    onChange={(e) => handleChange('name', e.target.value)} 
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-1.5">
                    <Phone size={13} /> Mobile Number
                  </label>
                  <Input 
                    value={form.mobile} 
                    onChange={(e) => handleChange('mobile', e.target.value)} 
                    placeholder="Enter mobile number"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-1.5">
                    <Mail size={13} /> Email Address (Immutable)
                  </label>
                  <Input 
                    value={form.email} 
                    disabled 
                    className="bg-surface-50 dark:bg-dark-hover/40 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 flex items-center gap-1.5">
                    <Award size={13} /> Assigned Workspace Role
                  </label>
                  <Input 
                    value={form.role} 
                    disabled 
                    className="bg-surface-50 dark:bg-dark-hover/40 cursor-not-allowed capitalize"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-dark-border/40">
                <Button onClick={handleSave} loading={saving}>
                  Save Profile Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card>
            <CardHeader className="pb-4 border-b border-gray-100 dark:border-dark-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Key size={16} className="text-primary-500" />
                Change Password
              </CardTitle>
              <CardDescription>Update your secret key. This will log you out of all other active sessions.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Current Password</label>
                    <Input
                      type="password"
                      value={passwords.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">New Password</label>
                    <Input
                      type="password"
                      value={passwords.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Confirm New Password</label>
                    <Input
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" loading={passwordSaving}>
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Onboarding Summary / Onboarding Edit */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-4 border-b border-gray-100 dark:border-dark-border/60 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Compass size={16} className="text-primary-500" />
                  Workspace Context
                </CardTitle>
                <CardDescription>Tailored dashboard preferences.</CardDescription>
              </div>
              {form.onboarding && !isEditingOnboarding && (
                <button
                  onClick={() => setIsEditingOnboarding(true)}
                  className="p-1 rounded-md text-surface-500 hover:text-gray-900 dark:text-surface-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 transition-colors"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </CardHeader>
            <CardContent className="p-5">
              {!form.onboarding ? (
                <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                  <div className="h-12 w-12 rounded-full bg-surface-50 dark:bg-dark-hover/40 flex items-center justify-center mb-3">
                    <Compass className="h-6 w-6 text-surface-400" />
                  </div>
                  <p className="text-xs text-surface-500 dark:text-surface-400 leading-normal">
                    No onboarding preferences configured. Workspace setup is using default settings.
                  </p>
                </div>
              ) : isEditingOnboarding ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-surface-500 uppercase">Workspace Purpose</label>
                    <Select
                      value={onboardingEdit.purpose}
                      onChange={(e) => handleOnboardingChange('purpose', e.target.value)}
                      options={PURPOSE_OPTIONS}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-surface-500 uppercase">Profession</label>
                    <Select
                      value={onboardingEdit.profession}
                      onChange={(e) => handleOnboardingChange('profession', e.target.value)}
                      options={PROFESSION_OPTIONS}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-surface-500 uppercase">Target Domain</label>
                    <Select
                      value={onboardingEdit.domain}
                      onChange={(e) => handleOnboardingChange('domain', e.target.value)}
                      options={DOMAIN_OPTIONS}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-surface-500 uppercase">Team Size</label>
                    <Select
                      value={onboardingEdit.teamSize}
                      onChange={(e) => handleOnboardingChange('teamSize', e.target.value)}
                      options={TEAM_SIZE_OPTIONS}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingOnboarding(false);
                        setOnboardingEdit({
                          purpose: form.onboarding.purpose,
                          profession: form.onboarding.profession,
                          domain: form.onboarding.domain,
                          teamSize: form.onboarding.teamSize
                        });
                      }}
                      className="px-2.5 py-1 text-xs"
                    >
                      <X size={12} className="mr-1" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleOnboardingSave}
                      loading={onboardingSaving}
                      className="px-2.5 py-1 text-xs"
                    >
                      <Check size={12} className="mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-surface-50 dark:bg-dark-hover/20 border border-gray-100 dark:border-dark-border/40 flex items-start gap-2.5">
                    <Sparkles size={16} className="text-primary-500 mt-0.5" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Workspace Personalization Active</h4>
                      <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-0.5 font-medium leading-relaxed">
                        Preferences configured to support targeted dashboard templates.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-dark-border/40 text-xs">
                    <div className="flex items-center justify-between py-2.5">
                      <span className="font-semibold text-surface-500 dark:text-surface-400">Workspace Purpose</span>
                      <Badge variant="outline" className="text-[10px] px-2 py-0 capitalize">
                        {PURPOSE_OPTIONS.find(o => o.value === form.onboarding.purpose)?.label || form.onboarding.purpose || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="font-semibold text-surface-500 dark:text-surface-400">Profession</span>
                      <Badge variant="outline" className="text-[10px] px-2 py-0 capitalize">
                        {PROFESSION_OPTIONS.find(o => o.value === form.onboarding.profession)?.label || form.onboarding.profession || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="font-semibold text-surface-500 dark:text-surface-400">Target Domain</span>
                      <Badge variant="outline" className="text-[10px] px-2 py-0 capitalize">
                        {DOMAIN_OPTIONS.find(o => o.value === form.onboarding.domain)?.label || form.onboarding.domain || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="font-semibold text-surface-500 dark:text-surface-400">Expected Team Size</span>
                      <Badge variant="outline" className="text-[10px] px-2 py-0 capitalize">
                        {TEAM_SIZE_OPTIONS.find(o => o.value === form.onboarding.teamSize)?.label || form.onboarding.teamSize || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
