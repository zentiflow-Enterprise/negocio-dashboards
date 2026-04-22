// lib/onboarding/validation.ts

import { createClient } from "@supabase/lib/client";
import { ONBOARDING_STEPS } from "./steps";

export async function validateOnboardingStep(
    stepKey: string,
    negocioId: string
): Promise<boolean> {
    const supabase = createClient();

    switch (stepKey) {
        case 'empresa': {
            const { data: negocio } = await supabase
                .from('config_negocio')        // ✅ tabla correcta
                .select('neg_nombre, neg_tipo, neg_ciudad, neg_moneda')
                .eq('negocio_id', negocioId)
                .single();

            return !!(
                negocio?.neg_nombre &&
                negocio?.neg_tipo &&           // ✅ neg_tipo en lugar de tipo_negocio
                negocio?.neg_ciudad &&
                negocio?.neg_moneda            // ✅ neg_moneda en lugar de moneda
            );
        }
        case 'especialidades': {
            const { count } = await supabase
                .from('especialidades')
                .select('*', { count: 'exact', head: true })
                .eq('negocio_id', negocioId);

            return (count ?? 0) > 0;
        }

        case 'profesionales': {
            const { count } = await supabase
                .from('profesionales')
                .select('*', { count: 'exact', head: true })
                .eq('negocio_id', negocioId);

            return (count ?? 0) > 0;
        }

        case 'servicios': {
            const { count } = await supabase
                .from('servicios')
                .select('*', { count: 'exact', head: true })
                .eq('negocio_id', negocioId);

            return (count ?? 0) > 0;
        }

        case 'horarios': {
            const { count } = await supabase
                .from('config_negocio_horario')  // ✅ nombre correcto
                .select('*', { count: 'exact', head: true })
                .eq('negocio_id', negocioId);

            return (count ?? 0) > 0;
        }

        case 'dashboard':
            return true;

        default:
            return false;
    }
}

export interface OnboardingProgress {
    currentStep: number;
    completedSteps: number[];
    totalSteps: number;
    progress: number;
    isCompleted: boolean;
    validations: Array<{
        stepId: number;
        stepKey: string;
        isCompleted: boolean;
    }>;
}

export async function calculateOnboardingProgress(
    negocioId: string
): Promise<OnboardingProgress> {
    const validations = await Promise.all(
        ONBOARDING_STEPS.map(async (step) => ({
            stepId: step.id,
            stepKey: step.key,
            isCompleted: await validateOnboardingStep(step.key, negocioId)
        }))
    );

    // Encontrar el primer paso no completado (que no sea opcional)
    let currentStep = ONBOARDING_STEPS.length;

    for (const validation of validations) {
        const stepConfig = ONBOARDING_STEPS[validation.stepId - 1];
        if (!validation.isCompleted && !stepConfig?.optional) {
            currentStep = validation.stepId;
            break;
        }
    }

    const completedCount = validations.filter(v => v.isCompleted).length;
    const isFullyCompleted = currentStep === ONBOARDING_STEPS.length;

    return {
        currentStep,
        completedSteps: validations.filter(v => v.isCompleted).map(v => v.stepId),
        totalSteps: ONBOARDING_STEPS.length,
        progress: Math.round((completedCount / ONBOARDING_STEPS.length) * 100),
        isCompleted: isFullyCompleted,
        validations
    };
}