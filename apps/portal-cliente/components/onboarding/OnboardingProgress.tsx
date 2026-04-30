// components/onboarding/OnboardingProgress.tsx

"use client";

import { useState } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { OnboardingStep } from '@/lib/onboarding/steps';

interface OnboardingProgressProps {
    currentStep: number;
    totalSteps: number;
    progress: number;
    steps: OnboardingStep[];
    completedSteps?: number[];
    onNavigate: (path: string) => void;
    onComplete: () => void;
}

export function OnboardingProgress({
    currentStep,
    totalSteps,
    progress,
    steps,
    completedSteps = [],
    onNavigate,
    onComplete
}: OnboardingProgressProps) {
    const [isMinimized, setIsMinimized] = useState(false);

    const currentStepData = steps?.find(s => s.id === currentStep);
    const nextIncompleteStep = steps?.find(
        s => !completedSteps.includes(s.id) && !s.isFinal
    );

    // Botón flotante cuando está minimizado
    if (isMinimized) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2.5 font-medium text-white border border-white/10"
                style={{
                    background: 'var(--accent)',
                    filter: 'brightness(0.95)'
                }}
            >
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                <span className="text-sm">
                    Configuración {currentStep}/{totalSteps}
                </span>
            </button>
        );
    }

    return (
        <div className="border-b bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-white/5 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-start justify-between gap-4">

                    {/* Info y progreso */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2.5">
                            <div className="flex items-center gap-2.5">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                                    style={{ background: 'var(--accent)' }}
                                >
                                    {currentStep}
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                        Configuración inicial
                                    </h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {completedSteps.length} de {totalSteps} pasos completados
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                                    style={{
                                        width: `${progress}%`,
                                        background: 'var(--accent)'
                                    }}
                                />
                            </div>
                            <span className="text-sm font-semibold min-w-[45px] text-right text-gray-700 dark:text-gray-300">
                                {progress}%
                            </span>
                        </div>

                        {/* Descripción del paso actual */}
                        {currentStepData && !currentStepData.isFinal && (
                            <div className="mt-3 flex items-start gap-2.5">
                                <span className="text-2xl mt-0.5">{currentStepData.icon}</span>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {currentStepData.title}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {currentStepData.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Mensaje final */}
                        {currentStepData?.isFinal && (
                            <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                    <Check className="w-4 h-4" />
                                    ¡Felicitaciones! Tu negocio está listo para recibir citas
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-start gap-2">
                        {nextIncompleteStep && (
                            <button
                                onClick={() => onNavigate(nextIncompleteStep.path)}
                                className="px-4 py-2.5 rounded-lg text-white transition-all duration-200 flex items-center gap-2 font-medium shadow-md hover:shadow-lg text-sm border border-white/10"
                                style={{
                                    background: 'var(--accent)',
                                    filter: 'brightness(1)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                            >
                                Continuar
                                <ChevronRight size={16} />
                            </button>
                        )}

                        {currentStepData?.isFinal && (
                            <button
                                onClick={() => {
                                    console.log('Finalizar clicked');
                                    onComplete();
                                }}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-medium shadow-md hover:shadow-lg text-sm"
                            >
                                <Check size={16} />
                                Finalizar
                            </button>
                        )}

                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
                            title="Minimizar"
                        >
                            <X size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}