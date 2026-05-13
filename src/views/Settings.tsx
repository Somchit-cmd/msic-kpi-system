'use client';

import { useState } from 'react';
import { useEvaluation } from '@/context/EvaluationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShieldAlert, Plus, X, Building2, Briefcase, Save, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { currentUser, settings, updateSetting } = useEvaluation();

  const [departments, setDepartments] = useState<string[]>(settings.departments);
  const [jobTitles, setJobTitles] = useState<Record<string, string[]>>(settings.jobTitles);
  const [objectiveCategories, setObjectiveCategories] = useState<string[]>(settings.objectiveCategories);
  const [newDept, setNewDept] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [savingDept, setSavingDept] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  if (currentUser.role !== 'superadmin' && currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Only System Admins and HR Admins can access Settings.</p>
      </div>
    );
  }

  // ---- Department section ----
  const addDepartment = () => {
    const trimmed = newDept.trim();
    if (!trimmed) return;
    if (departments.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Department already exists');
      return;
    }
    setDepartments(prev => [...prev, trimmed]);
    // Initialize empty job titles array for the new department
    setJobTitles(prev => ({ ...prev, [trimmed]: prev[trimmed] || [] }));
    setNewDept('');
  };

  const removeDepartment = (dept: string) => {
    setDepartments(prev => prev.filter(d => d !== dept));
    // Remove job titles for this department
    setJobTitles(prev => {
      const next = { ...prev };
      delete next[dept];
      return next;
    });
    if (selectedDept === dept) setSelectedDept('');
  };

  const saveDepartments = async () => {
    setSavingDept(true);
    await updateSetting('departments', departments);
    // Clean up jobTitles for removed departments
    const cleaned: Record<string, string[]> = {};
    for (const dept of departments) {
      cleaned[dept] = jobTitles[dept] || [];
    }
    setJobTitles(cleaned);
    await updateSetting('jobTitles', cleaned);
    setSavingDept(false);
    toast.success('Departments saved');
  };

  // ---- Job Title section ----
  const currentTitles = jobTitles[selectedDept] || [];

  const addJobTitle = () => {
    const trimmed = newTitle.trim();
    if (!trimmed || !selectedDept) return;
    if (currentTitles.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Job title already exists in this department');
      return;
    }
    setJobTitles(prev => ({
      ...prev,
      [selectedDept]: [...(prev[selectedDept] || []), trimmed],
    }));
    setNewTitle('');
  };

  const removeJobTitle = (title: string) => {
    setJobTitles(prev => ({
      ...prev,
      [selectedDept]: (prev[selectedDept] || []).filter(t => t !== title),
    }));
  };

  const saveJobTitles = async () => {
    setSavingTitle(true);
    // Save as the full Record<string, string[]> — API stores it as JSON
    await updateSetting('jobTitles', jobTitles);
    setSavingTitle(false);
    toast.success('Job titles saved');
  };

  // ---- Objective Category section ----
  const addObjectiveCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (objectiveCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }
    setObjectiveCategories(prev => [...prev, trimmed]);
    setNewCategory('');
  };

  const removeObjectiveCategory = (category: string) => {
    setObjectiveCategories(prev => prev.filter(c => c !== category));
  };

  const saveObjectiveCategories = async () => {
    setSavingCategory(true);
    await updateSetting('objectiveCategories', objectiveCategories);
    setSavingCategory(false);
    toast.success('Objective categories saved');
  };

  // Total count of all job titles across departments
  const totalTitles = Object.values(jobTitles).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage system configuration options like departments, job titles, and objective categories.</p>
      </div>

      {/* Department Options */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Department Options
            </CardTitle>
            <CardDescription>Define the available departments for user assignment.</CardDescription>
          </div>
          <Button size="sm" onClick={saveDepartments} disabled={savingDept}>
            <Save className="h-4 w-4 mr-1" /> {savingDept ? 'Saving...' : 'Save'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newDept}
              onChange={e => setNewDept(e.target.value)}
              placeholder="Add new department..."
              onKeyDown={e => e.key === 'Enter' && addDepartment()}
            />
            <Button variant="outline" size="icon" onClick={addDepartment} disabled={!newDept.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {departments.length === 0 && (
              <p className="text-sm text-muted-foreground">No departments configured. Add one above.</p>
            )}
            {departments.map(dept => (
              <Badge key={dept} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3 text-sm">
                {dept}
                <span className="text-xs text-muted-foreground">({(jobTitles[dept] || []).length})</span>
                <button
                  onClick={() => removeDepartment(dept)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Job Title Options — organized by department */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Job Title Options
            </CardTitle>
            <CardDescription>
              Define job titles per department. Select a department to manage its titles.
            </CardDescription>
          </div>
          <Button size="sm" onClick={saveJobTitles} disabled={savingTitle}>
            <Save className="h-4 w-4 mr-1" /> {savingTitle ? 'Saving...' : 'Save'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add departments first, then configure job titles for each.</p>
          ) : (
            <>
              {/* Department selector */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-2 min-w-[200px]">
                  <label className="text-sm font-medium">Department</label>
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Add title for selected department */}
              {selectedDept && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder={`Add job title for ${selectedDept}...`}
                      onKeyDown={e => e.key === 'Enter' && addJobTitle()}
                    />
                    <Button variant="outline" size="icon" onClick={addJobTitle} disabled={!newTitle.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentTitles.length === 0 && (
                      <p className="text-sm text-muted-foreground">No job titles for {selectedDept} yet. Add one above.</p>
                    )}
                    {currentTitles.map(title => (
                      <Badge key={title} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3 text-sm">
                        {title}
                        <button
                          onClick={() => removeJobTitle(title)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {!selectedDept && (
                <p className="text-sm text-muted-foreground">Select a department above to manage its job titles.</p>
              )}

              {/* Summary of all departments and their titles */}
              {totalTitles > 0 && (
                <div className="border-t pt-4 mt-4 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Overview</p>
                  {departments.map(dept => {
                    const titles = jobTitles[dept] || [];
                    if (titles.length === 0) return null;
                    return (
                      <div key={dept} className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium min-w-[120px]">{dept}:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {titles.map(t => (
                            <Badge key={t} variant="outline" className="text-xs py-0.5 px-2">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Objective Category Options */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Objective Categories
            </CardTitle>
            <CardDescription>
              Define the available categories for KPI objectives (e.g. Operation, Financial, People, Innovation, Customer). These categories will appear in the KPI setup form.
            </CardDescription>
          </div>
          <Button size="sm" onClick={saveObjectiveCategories} disabled={savingCategory}>
            <Save className="h-4 w-4 mr-1" /> {savingCategory ? 'Saving...' : 'Save'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="Add new objective category..."
              onKeyDown={e => e.key === 'Enter' && addObjectiveCategory()}
            />
            <Button variant="outline" size="icon" onClick={addObjectiveCategory} disabled={!newCategory.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {objectiveCategories.length === 0 && (
              <p className="text-sm text-muted-foreground">No objective categories configured. Add one above.</p>
            )}
            {objectiveCategories.map(category => (
              <Badge key={category} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3 text-sm">
                {category}
                <button
                  onClick={() => removeObjectiveCategory(category)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {objectiveCategories.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{objectiveCategories.length}</span> categor{objectiveCategories.length === 1 ? 'y' : 'ies'} configured.
                These will be available as options when creating KPI objectives.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
