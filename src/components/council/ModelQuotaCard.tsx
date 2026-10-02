import React from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, ShieldAlert, ShieldCheck, RotateCcw } from 'lucide-react';
import { ModelBudgetInfo } from '../../types/topology';

interface ModelQuotaCardProps {
  model: ModelBudgetInfo;
  onReset?: (modelId: string) => void;
  isResetting?: boolean;
}

export const ModelQuotaCard: React.FC<ModelQuotaCardProps> = ({
  model,
  onReset,
  isResetting = false,
}) => {
  const getStatusBadge = () => {
    switch (model.status) {
      case 'safety_stopped':
        return {
          label: 'Safety Stopped',
          className: 'bg-rose-500/15 text-rose-300',
          dot: 'bg-rose-400',
          icon: ShieldAlert,
        };
      case 'throttled':
        return {
          label: 'Throttled',
          className: 'bg-purple-500/15 text-purple-300',
          dot: 'bg-purple-400',
          icon: Clock,
        };
      case 'approaching_limit':
        return {
          label: 'Approaching Limit',
          className: 'bg-amber-500/15 text-amber-300',
          dot: 'bg-amber-400',
          icon: ShieldAlert,
        };
      case 'healthy':
      default:
        return {
          label: 'Healthy Headroom',
          className: 'bg-emerald-500/15 text-emerald-300',
          dot: 'bg-emerald-400',
          icon: ShieldCheck,
        };
    }
  };

  const statusInfo = getStatusBadge();
  const StatusIcon = statusInfo.icon;

  const getMeterColor = (percent: number) => {
    if (percent >= 85) return 'bg-rose-500';
    if (percent >= 60) return 'bg-amber-400';
    return 'bg-gradient-to-r from-indigo-500 to-violet-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-xl p-5 shadow-xl transition-all text-slate-100 flex flex-col justify-between"
    >
      <div>
        {/* Model Card Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.07] backdrop-blur-md flex items-center justify-center text-2xl shadow-md">
              {model.avatar || '🤖'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold tracking-tight text-white">{model.name}</h4>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
                  {model.family}
                </span>
              </div>
              <p className="text-xs text-indigo-300/80 font-medium">{model.role}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${statusInfo.className}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} animate-pulse`} />
              <StatusIcon className="w-3 h-3" />
              <span>{statusInfo.label}</span>
            </span>

            {model.cost?.sessionCostUsd !== undefined && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                <DollarSign className="w-3 h-3 text-emerald-400" />
                <span>${model.cost.sessionCostUsd.toFixed(4)} USD</span>
              </span>
            )}
          </div>
        </div>

        {/* Quota Progress Meters */}
        <div className="space-y-3.5 mb-4">
          {/* RPM Meter */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <span>Requests / Min (RPM)</span>
                <span className="text-[10px] text-slate-500 font-mono">85% Safe Ceiling</span>
              </span>
              <span className="font-mono text-slate-200">
                {model.rpm.current} / {model.rpm.limit}{' '}
                <span className="text-slate-500 text-[10px]">({Math.round(model.rpm.percent)}%)</span>
              </span>
            </div>
            <div className="relative w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getMeterColor(
                  model.rpm.percent
                )}`}
                style={{ width: `${Math.min(100, Math.max(0, model.rpm.percent))}%` }}
              />
              {/* 85% Safety Ceiling Guide Pin */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-400/80 pointer-events-none"
                style={{ left: '85%' }}
                title="85% Safety Stop Ceiling"
              />
            </div>
          </div>

          {/* TPM Meter */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <span>Tokens / Min (TPM)</span>
                <span className="text-[10px] text-slate-500 font-mono">85% Safe Ceiling</span>
              </span>
              <span className="font-mono text-slate-200">
                {model.tpm.current.toLocaleString()} / {model.tpm.limit.toLocaleString()}{' '}
                <span className="text-slate-500 text-[10px]">({Math.round(model.tpm.percent)}%)</span>
              </span>
            </div>
            <div className="relative w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getMeterColor(
                  model.tpm.percent
                )}`}
                style={{ width: `${Math.min(100, Math.max(0, model.tpm.percent))}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-400/80 pointer-events-none"
                style={{ left: '85%' }}
                title="85% Safety Stop Ceiling"
              />
            </div>
          </div>

          {/* Daily Meter */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium">Daily Token Allocation</span>
              <span className="font-mono text-slate-200">
                {model.daily.current.toLocaleString()} / {model.daily.limit.toLocaleString()}{' '}
                <span className="text-slate-500 text-[10px]">({Math.round(model.daily.percent)}%)</span>
              </span>
            </div>
            <div className="relative w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getMeterColor(
                  model.daily.percent
                )}`}
                style={{ width: `${Math.min(100, Math.max(0, model.daily.percent))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer / TTR Countdown */}
      <div className="pt-3 bg-white/[0.01] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px]">
            Window TTR:{' '}
            <span className="font-mono text-slate-200 font-medium">
              {model.ttr.formattedWindow || `${model.ttr.windowSeconds}s`}
            </span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px]">
            Daily Reset:{' '}
            <span className="font-mono text-slate-300">
              {model.ttr.formattedDaily || `${model.ttr.dailySeconds}s`}
            </span>
          </span>
        </div>

        {onReset && (
          <button
            type="button"
            onClick={() => onReset(model.id)}
            disabled={isResetting}
            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-white/[0.06] rounded-xl transition-all border-none outline-none cursor-pointer"
            title={`Reset quotas for ${model.name}`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
