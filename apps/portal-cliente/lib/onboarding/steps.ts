// lib/onboarding/steps.ts

export interface OnboardingStep {
    id: number;
    key: string;
    path: string;
    title: string;
    description: string;
    icon: string;
    minItems?: number;
    optional?: boolean;
    skipLabel?: string;
    isFinal?: boolean;
    fields?: string[];
    hasData?: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: 1,
        key: 'empresa',
        path: '/empresa',
        title: 'Información de tu negocio',
        description: 'Completa los datos básicos de tu empresa',
        icon: '🏢',
        fields: ['nombre', 'tipo_negocio', 'ciudad', 'moneda', 'telefono'],
        optional: false
    },
    {
        id: 2,
        key: 'especialidades',
        path: '/especialidades',
        title: 'Define especialidades',
        description: 'Categorías de servicios que ofreces',
        icon: '⭐',
        minItems: 1,
        optional: false
    },
    {
        id: 3,
        key: 'profesionales',
        path: '/profesionales',
        title: 'Agrega profesionales',
        description: 'Tu equipo que atenderá las citas',
        icon: '👥',
        minItems: 1,
        optional: true,
        skipLabel: 'Soy el único profesional'
    },
    {
        id: 4,
        key: 'servicios',
        path: '/servicios',
        title: 'Crea servicios',
        description: 'Los servicios que tus clientes pueden agendar',
        icon: '💼',
        minItems: 1,
        optional: false
    },
    {
        id: 5,
        key: 'horarios',
        path: '/empresa#horarios',
        title: 'Horarios de atención',
        description: 'Define cuándo puedes recibir citas',
        icon: '🕐',
        hasData: true,
        optional: false
    },
    {
        id: 6,
        key: 'dashboard',
        path: '/dashboard',
        title: '¡Todo listo!',
        description: 'Comienza a recibir tus primeras citas',
        icon: '🎉',
        isFinal: true
    }
];

export const getTotalSteps = () => ONBOARDING_STEPS.length;

export const getStepByKey = (key: string) =>
    ONBOARDING_STEPS.find(step => step.key === key);

export const getStepById = (id: number) =>
    ONBOARDING_STEPS.find(step => step.id === id);