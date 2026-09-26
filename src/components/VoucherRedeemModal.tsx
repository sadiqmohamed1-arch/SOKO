import React, { useState } from 'react';
import {
  X,
  Award,
  CheckCircle,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  Ticket,
  Calendar,
  Building,
} from 'lucide-react';
import { RewardVoucherItem, UserRewardProfile } from '../types';

interface VoucherRedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: RewardVoucherItem | null;
  rewardProfile: UserRewardProfile;
  onConfirmRedeem: (voucherId: string) => void;
}

export const VoucherRedeemModal: React.FC<VoucherRedeemModalProps> = ({
  isOpen,
  onClose,
  voucher,
  rewardProfile,
  onConfirmRedeem,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [redeemedJustNow, setRedeemedJustNow] = useState(false);

  if (!isOpen || !voucher) return null;

  const hasEnoughPoints = rewardProfile.totalPoints >= voucher.pointsRequired;
  const isAlreadyRedeemed = voucher.isRedeemed || redeemedJustNow;

  const handleRedeem = () => {
    if (!hasEnoughPoints || isAlreadyRedeemed) return;
    onConfirmRedeem(voucher.id);
    setRedeemedJustNow(true);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(voucher.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                SoKo Rewards & Voucher Store
              </span>
              <span className="text-xs text-slate-500">Redeem Earned Points for Real Savings</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Voucher Graphic Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl overflow-hidden border border-slate-800">
            {/* Background design elements */}
            <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
            <div className="absolute -left-8 -top-8 w-40 h-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-[11px] font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {voucher.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-xs border border-amber-500/30">
                {voucher.discountValue}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
              {voucher.title}
            </h3>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {voucher.description}
            </p>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {voucher.partnerCompany || 'SoKo Verified Partner'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Valid: {voucher.validUntil}
              </span>
            </div>

            {/* Generated Coupon Box if Redeemed */}
            {isAlreadyRedeemed && (
              <div className="mt-5 p-4 rounded-xl bg-slate-800/90 border border-amber-400/40 text-center space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Your Active Voucher Code
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-base font-extrabold text-white tracking-widest bg-black/40 px-3 py-1.5 rounded-lg border border-slate-700">
                    {voucher.code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors"
                    title="Copy Promo Code"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Simulated Barcode */}
                <div className="pt-2">
                  <div className="flex items-center justify-center gap-1 h-7 opacity-80">
                    {[1,2,1,3,1,2,4,1,2,1,3,2,1,4,2,1,2,3,1,2,1].map((w, i) => (
                      <span
                        key={i}
                        className="bg-white inline-block h-full"
                        style={{ width: `${w * 2}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono tracking-widest mt-1 block">
                    {voucher.code}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Points Balance & Cost Breakdown */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Cost to Redeem:</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Award className="w-4 h-4 text-amber-500" />
                {voucher.pointsRequired} Points
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Your Current Balance:</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Award className="w-4 h-4 text-blue-600" />
                {rewardProfile.totalPoints} Points
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">Remaining Balance After:</span>
              <span className={`font-bold ${hasEnoughPoints ? 'text-emerald-700' : 'text-red-600'}`}>
                {hasEnoughPoints ? rewardProfile.totalPoints - voucher.pointsRequired : 'Insufficient Points'} Points
              </span>
            </div>
          </div>

          {/* Insufficient points alert */}
          {!hasEnoughPoints && !isAlreadyRedeemed && (
            <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 flex items-center gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>
                You need {voucher.pointsRequired - rewardProfile.totalPoints} more points. Complete daily logins, listen to podcasts, or attend webinars to earn points!
              </span>
            </div>
          )}

          {/* Terms */}
          <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-700 block mb-1">Redemption Terms & Conditions:</span>
            {voucher.terms}
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Close
            </button>

            {isAlreadyRedeemed ? (
              <button
                onClick={handleCopyCode}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-2"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4" />
                    Code Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Promo Code ({voucher.code})
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleRedeem}
                disabled={!hasEnoughPoints}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer ${
                  hasEnoughPoints
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Redeem for {voucher.pointsRequired} Points
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
