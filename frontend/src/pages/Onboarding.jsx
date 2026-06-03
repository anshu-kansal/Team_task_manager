import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { updateProfile } from '../api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import {
  User, GraduationCap, Briefcase, Rocket, Building, ShieldCheck, Landmark, CheckSquare,
  Cpu, Palette, Megaphone, DollarSign, Users, BookOpen, Heart, BarChart3,
  Globe, Smartphone, Terminal, Database, ShieldAlert, Edit3, Zap, Sparkles, Check
} from 'lucide-react';

const PURPOSE_OPTIONS = ['Individual', 'Student', 'Freelancer', 'Startup', 'Corporate Employee', 'Team Lead', 'Agency', 'Other'];
const CATEGORY_OPTIONS = ['Tech', 'Non-Tech', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 'Education', 'Healthcare', 'Business', 'Other'];
const DOMAIN_OPTIONS = ['Web Development', 'App Development', 'AI/ML', 'Data Science', 'Cybersecurity', 'UI/UX', 'Content Writing', 'Digital Marketing', 'Finance', 'Operations', 'Other'];
const TEAM_SIZE_OPTIONS = ['Individual', '2-5', '5-10', '10-50', '50+'];

const OPTION_ICONS = {
  // Purpose
  'Individual': User,
  'Student': GraduationCap,
  'Freelancer': Briefcase,
  'Startup': Rocket,
  'Corporate Employee': Building,
  'Team Lead': ShieldCheck,
  'Agency': Landmark,
  // Profession/Category
  'Tech': Cpu,
  'Non-Tech': Briefcase,
  'Design': Palette,
  'Marketing': Megaphone,
  'Sales': DollarSign,
  'Finance': Landmark,
  'HR': Users,
  'Education': BookOpen,
  'Healthcare': Heart,
  'Business': BarChart3,
  // Domain
  'Web Development': Globe,
  'App Development': Smartphone,
  'AI/ML': Terminal,
  'Data Science': Database,
  'Cybersecurity': ShieldAlert,
  'UI/UX': Palette,
  'Content Writing': Edit3,
  'Digital Marketing': Megaphone,
  'Operations': Zap,
  // Team Sizes
  '2-5': Users,
  '5-10': Users,
  '10-50': Users,
  '50+': Users,
  // Generic / Default
  'Other': Sparkles,
};

export default function Onboarding({ user }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    purpose: '',
    profession: '',
    domain: '',
    teamSize: '',
    collaboration: [],
    onboardingCompleted: true
  });
  const toast = useToast();
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);

  useEffect(() => {
    const existing = localStorage.getItem('ttm_onboarding');
    if (existing) {
      setForm({ ...form, ...JSON.parse(existing) });
    }
  }, []);

  const save = (payload) => {
    const next = { ...form, ...payload };
    setForm(next);
    localStorage.setItem('ttm_onboarding', JSON.stringify(next));
  };

  const handleContinue = async () => {
    if (step < 5) {
      setStep(step + 1);
      return;
    }

    try {
      const response = await updateProfile(form);
      setUser(response.data.user);
      localStorage.removeItem('ttm_onboarding');
      toast('Onboarding saved. Welcome to your dashboard.', 'success');
      navigate('/dashboard');
    } catch (err) {
      toast('Failed to save onboarding preferences.', 'error');
      navigate('/dashboard');
    }
  };

  const handleSkip = () => {
    toast('Onboarding skipped. You can complete it later from your profile.', 'info');
    navigate('/dashboard');
  };

  const pct = Math.round((step / 5) * 100);

  const OptionGrid = ({ options, valueKey, value }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
      {options.map((option) => {
        const Icon = OPTION_ICONS[option] || Sparkles;
        const isSelected = value === option;
        return (
          <button
            key={option}
            onClick={() => save({ [valueKey]: option })}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2.5 h-24 text-center",
              isSelected 
                ? "border-primary-600 bg-primary-50/80 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300 dark:border-primary-500 shadow-sm scale-[0.98]" 
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-border dark:bg-dark-card dark:text-gray-300 dark:hover:bg-dark-hover"
            )}
          >
            <Icon size={20} className={isSelected ? "text-primary-600 dark:text-primary-400 animate-pulse-soft" : "text-surface-400 dark:text-surface-500"} />
            <span className="text-xs font-semibold tracking-tight">{option}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg p-4 md:p-8">
      <Card className="w-full max-w-4xl shadow-float dark:shadow-dark-float overflow-hidden border-none">
        <div className="flex flex-col md:flex-row h-full min-h-[580px]">
          {/* Left panel - Progress */}
          <div className="md:w-1/3 bg-gray-900 p-8 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-gradient-to-b from-primary-600/35 to-purple-700/25" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 text-primary-400 font-semibold text-xs tracking-widest uppercase mb-1">
                  <Sparkles size={14} /> Setup Wizard
                </div>
                <h2 className="text-2xl font-bold mb-8">Personalize your Workspace</h2>
                
                <div className="space-y-5">
                  {[
                    { num: 1, text: 'Main purpose' },
                    { num: 2, text: 'Profession' },
                    { num: 3, text: 'Domain & field' },
                    { num: 4, text: 'Expected Team size' },
                    { num: 5, text: 'Collaboration' }
                  ].map((s) => (
                    <div key={s.num} className={cn("flex items-center space-x-3 transition-opacity duration-200", step === s.num ? "opacity-100" : "opacity-45")}>
                      <div className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all", 
                        step >= s.num ? "border-primary-500 bg-primary-500 text-white" : "border-gray-700 text-gray-500"
                      )}>
                        {step > s.num ? <Check size={12} strokeWidth={3} /> : s.num}
                      </div>
                      <span className={cn("text-xs font-medium", step >= s.num ? 'text-white' : 'text-gray-500')}>{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress bar info at the bottom */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5 font-medium">
                  <span>Progress Setup</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Right panel - Form */}
          <div className="md:w-2/3 p-8 md:p-10 flex flex-col bg-white dark:bg-dark-card justify-between">
            <div className="flex-1">
              {step === 1 && (
                <div className="animate-fade-in">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">What is your main purpose?</h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">This configures custom dashboard layouts for your objectives.</p>
                  <OptionGrid options={PURPOSE_OPTIONS} valueKey="purpose" value={form.purpose} />
                </div>
              )}

              {step === 2 && (
                <div className="animate-fade-in">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Choose your profession</h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">This sets template items aligned to workflows.</p>
                  <OptionGrid options={CATEGORY_OPTIONS} valueKey="profession" value={form.profession} />
                </div>
              )}

              {step === 3 && (
                <div className="animate-fade-in">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pick your domain or field</h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">What sector does your workspace work focus on?</p>
                  <OptionGrid options={DOMAIN_OPTIONS} valueKey="domain" value={form.domain} />
                </div>
              )}

              {step === 4 && (
                <div className="animate-fade-in">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">How large is your team?</h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">We adjust UI components dynamically for collaborative speed.</p>
                  <OptionGrid options={TEAM_SIZE_OPTIONS} valueKey="teamSize" value={form.teamSize} />
                </div>
              )}

              {step === 5 && (
                <div className="animate-fade-in">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Enable collaboration features</h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Activate optional workgroup items now.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                    {['Email invite system', 'Add teammates', 'Share tasks', 'Assign roles'].map((option) => {
                      const isSelected = form.collaboration.includes(option);
                      return (
                        <label 
                          key={option} 
                          className={cn(
                            "flex items-center p-3.5 border rounded-xl cursor-pointer transition-all duration-200",
                            isSelected 
                              ? "border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 shadow-sm" 
                              : "border-gray-200 dark:border-dark-border hover:bg-surface-50 dark:hover:bg-dark-hover"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => {
                              const nextCollab = isSelected
                                ? form.collaboration.filter((item) => item !== option)
                                : [...form.collaboration, option];
                              save({ collaboration: nextCollab });
                            }}
                          />
                          <div className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border flex-shrink-0 mr-3 transition-all",
                            isSelected 
                              ? "bg-primary-600 border-primary-600 text-white" 
                              : "border-gray-300 dark:border-gray-600"
                          )}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">{option}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions footer */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100 dark:border-dark-border">
              <Button variant="ghost" onClick={handleSkip} size="sm">
                Skip Setup
              </Button>
              <div className="flex space-x-2">
                {step > 1 && (
                  <Button variant="outline" onClick={() => setStep(step - 1)} size="sm">
                    Back
                  </Button>
                )}
                <Button onClick={handleContinue} size="sm">
                  {step < 5 ? 'Continue' : 'Finish Setup'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
