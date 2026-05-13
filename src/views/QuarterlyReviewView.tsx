'use client';

import { useEvaluation } from '@/context/EvaluationContext';
import { calcQuarterlyAvg } from '@/types/evaluation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { WorkflowProgress } from '@/components/WorkflowProgress';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function QuarterlyReviewView() {
  const { viewParams, navigate, getEvaluation, updateEvaluation, currentUser, hasDirectReports } = useEvaluation();
  const id = viewParams.id;
  const eval_ = getEvaluation(id || '');

  const [objs, setObjs] = useState(eval_?.objectives || []);

  if (!eval_) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Quarterly review not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/quarterly-reviews')}>Go Back</Button>
      </div>
    );
  }

  const isManager = hasDirectReports && eval_.managerId === currentUser.id;
  const isAdmin = currentUser.role === 'admin';
  const canScore = isManager && eval_.status === 'submitted';
  const canSignOff = isAdmin && eval_.status === 'manager_scored';
  const useManager = eval_.status === 'manager_scored' || eval_.status === 'hr_approved';

  const display = canScore ? objs : eval_.objectives;
  const selfAvg = calcQuarterlyAvg(eval_.objectives, false);
  const managerAvg = calcQuarterlyAvg(display, true);

  const setManagerPercent = (id: string, val: number) => {
    const v = Math.max(0, Math.min(25, val));
    setObjs(prev => prev.map(o => o.id === id ? { ...o, managerPercent: v } : o));
  };

  const submitManager = () => {
    if (objs.some(o => (o.managerPercent ?? 0) === 0)) { toast.error('Enter % for every objective'); return; }
    const nowIso = new Date().toISOString();
    updateEvaluation({
      ...eval_, objectives: objs, status: 'manager_scored', updatedAt: nowIso.split('T')[0],
      auditLog: [...(eval_.auditLog || []), { timestamp: nowIso, action: 'Manager Scored & Sent to HR', fromStatus: 'submitted', toStatus: 'manager_scored', actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role }],
    });
    toast.success('Manager scores submitted!');
    navigate('/quarterly-reviews');
  };

  const signOff = () => {
    const nowIso = new Date().toISOString();
    updateEvaluation({
      ...eval_, status: 'hr_approved', updatedAt: nowIso.split('T')[0],
      auditLog: [...(eval_.auditLog || []), { timestamp: nowIso, action: 'HR Approved & Finalized', fromStatus: 'manager_scored', toStatus: 'hr_approved', actorId: currentUser.id, actorName: currentUser.name, actorRole: currentUser.role }],
    });
    toast.success('Quarterly review signed off!');
    navigate('/quarterly-reviews');
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/quarterly-reviews')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{eval_.employeeName}</h1>
          <p className="text-muted-foreground">{eval_.employeeTitle} · {eval_.department} · {eval_.period} (Quarterly)</p>
        </div>
        <StatusBadge status={eval_.status} />
      </div>

      <WorkflowProgress status={eval_.status} />

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-xs text-muted-foreground">Self Avg</p><p className="text-2xl font-bold">{selfAvg.toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-xs text-muted-foreground">Manager Avg</p><p className="text-2xl font-bold text-primary">{useManager || canScore ? `${managerAvg.toFixed(1)}%` : '—'}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Part I — Objectives (% Achievement)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Objective</th>
                  <th className="pb-2 font-medium">Weight</th>
                  <th className="pb-2 font-medium">Self %</th>
                  <th className="pb-2 font-medium">Manager %</th>
                </tr>
              </thead>
              <tbody>
                {display.map((o, i) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-3">{i + 1}</td>
                    <td className="py-3">{o.description}</td>
                    <td className="py-3">{o.weight}%</td>
                    <td className="py-3 font-medium">{o.selfPercent ?? 0}%</td>
                    <td className="py-3">
                      {canScore ? (
                        <div className="flex items-center gap-1">
                          <Input type="number" min={0} max={25} className="w-20 h-8" value={o.managerPercent ?? 0} onChange={e => setManagerPercent(o.id, Number(e.target.value))} />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      ) : (
                        <span className="font-medium">{(o.managerPercent ?? 0) > 0 ? `${o.managerPercent}%` : '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {canScore && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={submitManager}>Submit Manager Scores</Button>
        </div>
      )}
      {canSignOff && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={signOff}>Sign Off & Finalize</Button>
        </div>
      )}
    </div>
  );
}
