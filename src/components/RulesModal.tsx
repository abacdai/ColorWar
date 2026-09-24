import React from 'react';
import { X, HelpCircle, Sparkles, ArrowRight } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-pop-in">
      <div className="relative w-full max-w-lg bg-[#fff9f2] rounded-3xl shadow-2xl border-4 border-[#fba886] p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-orange-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#ff5964] flex items-center justify-center text-white shadow-md">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-800">Color Wars Rules</h2>
              <p className="text-xs text-neutral-600 font-medium">Tactical chain reaction board control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-200 hover:bg-neutral-300 flex items-center justify-center text-neutral-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rule quotation */}
        <div className="my-4 p-3.5 bg-orange-100/70 border border-orange-300/80 rounded-2xl">
          <p className="text-xs uppercase font-bold tracking-wider text-orange-800 mb-1">Game Objective</p>
          <p className="text-sm italic font-semibold text-neutral-800">
            &ldquo;Try to occupy the whole field with your color. Click on your circles and capture 4 new squares when you reach 4 white dots in a circle.&rdquo;
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 text-sm text-neutral-700">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#00c0f8] text-white font-bold flex items-center justify-center text-xs">
              1
            </span>
            <div>
              <p className="font-bold text-neutral-900">Place or Upgrade Pieces:</p>
              <p className="text-neutral-600 text-xs mt-0.5">
                On your turn, tap any <strong className="text-neutral-900">empty square</strong> to place a new circle of your color (1 dot), or tap an <strong className="text-neutral-900">existing circle of your color</strong> to add +1 white dot.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#ff5964] text-white font-bold flex items-center justify-center text-xs">
              2
            </span>
            <div>
              <p className="font-bold text-neutral-900">Turn Indicator:</p>
              <p className="text-neutral-600 text-xs mt-0.5">
                The black box at the top highlights the current player number in that player&apos;s piece color. You cannot tap opponent circles directly.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#10b981] text-white font-bold flex items-center justify-center text-xs">
              3
            </span>
            <div>
              <p className="font-bold text-neutral-900">Cross (+) Explosion at 4 Dots:</p>
              <p className="text-neutral-600 text-xs mt-0.5">
                When a circle reaches <strong className="text-neutral-900">4 dots</strong>, it detonates and sends 4 projectiles in straight cardinal directions (Up, Down, Left, Right) by 1 square:
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-neutral-600 pl-2">
                <li className="flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span><strong>Adjacent empty cell:</strong> Instantly captured in your color with 1 dot.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span><strong>Friendly or opponent cell:</strong> Converted to your color and gains +1 dot!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#f59e0b] text-white font-bold flex items-center justify-center text-xs">
              4
            </span>
            <div>
              <p className="font-bold text-neutral-900">Chain Reaction Cascades:</p>
              <p className="text-neutral-600 text-xs mt-0.5">
                If neighbouring cells also reach 4 dots after absorbing projectiles, they explode in sequence! A smart move can ignite a cascading chain reaction that turns the entire board around.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
              5
            </span>
            <div>
              <p className="font-bold text-neutral-900">Victory Condition:</p>
              <p className="text-neutral-600 text-xs mt-0.5">
                Players who lose all their circles are eliminated. The game ends when <strong className="text-purple-700">only one color remains on the board</strong>. The owner of that color wins!
              </p>
            </div>
          </div>
        </div>

        {/* Visual Dots Guide */}
        <div className="mt-5 p-4 bg-orange-50 rounded-2xl border border-orange-200">
          <p className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-2 text-center">
            Dot Levels Overview
          </p>
          <div className="grid grid-cols-4 gap-2">
            {/* 1 dot */}
            <div className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-xl shadow-xs">
              <div className="w-10 h-10 rounded-full bg-[#00c0f8] flex items-center justify-center shadow-sm">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700">1 Dot</span>
            </div>
            {/* 2 dots */}
            <div className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-xl shadow-xs">
              <div className="w-10 h-10 rounded-full bg-[#00c0f8] flex items-center justify-center gap-1 shadow-sm">
                <div className="w-2 h-2 bg-white rounded-full" />
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700">2 Dots</span>
            </div>
            {/* 3 dots */}
            <div className="flex flex-col items-center gap-1.5 p-2 bg-[#fed5ce] rounded-xl shadow-xs">
              <div className="w-10 h-10 rounded-full bg-[#ff5964] flex flex-col items-center justify-center gap-0.5 shadow-sm">
                <div className="w-2 h-2 bg-white rounded-full" />
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#ff5964]">3 Dots (Ready)</span>
            </div>
            {/* 4 dots */}
            <div className="flex flex-col items-center gap-1.5 p-2 bg-orange-100 rounded-xl shadow-xs border border-orange-300">
              <div className="w-10 h-10 rounded-full bg-[#ff5964] flex items-center justify-center animate-pulse shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-bold text-red-600">4 Dots (BOOM!)</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3.5 bg-[#fba886] hover:bg-[#fa9670] active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg transition text-base cursor-pointer"
        >
          Got It, Ready to Battle!
        </button>
      </div>
    </div>
  );
};
