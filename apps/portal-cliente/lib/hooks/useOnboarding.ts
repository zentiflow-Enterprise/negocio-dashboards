// lib/hooks/useOnboarding.ts

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { createClient } from "@supabase/lib/client";
import { calculateOnboardingProgress } from '@/lib/onboarding/validation';
import { ONBOARDING_STEPS, OnboardingStep } from '@/lib/onboarding/steps';

export interface OnboardingData {
    status: 'pending' | 'in_progress' | 'completed';
    currentStep: number;
    totalSteps: number;
    progress: number;
    completedSteps: number[];
    isCompleted: boolean;
    shouldShow: boolean;
    steps: OnboardingStep[];
}

export function useOnboarding(negocioId?: string) {
    const [data, setData] = useState<OnboardingData | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();
    const pathname = usePathname();

    const fetchStatus = async () => {
        if (!negocioId) {
            setLoading(false);
            return;
        }

        try {
            // 1. Obtener estado desde BD
            const { data: negocio } = await supabase
                .from('negocios')
                .select('onboarding_status, onboarding_step')
                .eq('negocio_id', negocioId)
                .single();

            // 2. Si ya está completado, no mostrar nada
            if (negocio?.onboarding_status === 'completed') {
                setData({
                    status: 'completed',
                    currentStep: ONBOARDING_STEPS.length,
                    totalSteps: ONBOARDING_STEPS.length,
                    progress: 100,
                    completedSteps: ONBOARDING_STEPS.map(s => s.id),
                    isCompleted: true,
                    shouldShow: false,
                    steps: ONBOARDING_STEPS
                });
                setLoading(false);
                return;
            }

            // 3. Calcular progreso real
            const progress = await calculateOnboardingProgress(negocioId);
            console.log('progress:', progress);

            // 4. Auto-actualizar si está completado
            if (progress.isCompleted && negocio?.onboarding_status !== 'completed') {
                await supabase
                    .from('negocios')
                    .update({
                        onboarding_status: 'completed',
                        onboarding_step: ONBOARDING_STEPS.length
                    })
                    .eq('negocio_id', negocioId);
            } else if (progress.currentStep !== negocio?.onboarding_step) {
                // Actualizar step actual
                await supabase
                    .from('negocios')
                    .update({ onboarding_step: progress.currentStep })
                    .eq('negocio_id', negocioId);
            }

            setData({
                status: negocio?.onboarding_status || 'pending',
                currentStep: progress.currentStep,
                totalSteps: progress.totalSteps,
                progress: progress.progress,
                completedSteps: progress.completedSteps,
                isCompleted: progress.isCompleted,
                shouldShow: !progress.isCompleted,
                steps: ONBOARDING_STEPS
            });

        } catch (error) {
            console.error('Error fetching onboarding:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [negocioId, pathname]);

    const completeOnboarding = async () => {
        if (!negocioId) return;

        try {
            await supabase
                .from('negocios')
                .update({
                    onboarding_status: 'completed',
                    onboarding_step: ONBOARDING_STEPS.length
                })
                .eq('negocio_id', negocioId);

            await fetchStatus();
        } catch (error) {
            console.error('Error completing onboarding:', error);
        }
    };

    const navigateToStep = (path: string) => {
        router.push(path);
    };
    console.log('onboarding debug:', { data, loading, shouldShow: data?.shouldShow, negocioId, pathname });


    return {
        data,
        loading,
        shouldShow: data?.shouldShow ?? false,
        isCompleted: data?.isCompleted ?? false,
        currentStep: data?.currentStep ?? 1,
        completeOnboarding,
        navigateToStep,
        refetch: fetchStatus
    };
}