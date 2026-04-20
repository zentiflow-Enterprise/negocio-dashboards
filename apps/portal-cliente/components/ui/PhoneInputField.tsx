"use client";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Control, Controller, FieldValues, Path } from "react-hook-form";

interface PhoneInputFieldProps<T extends FieldValues> {
    name: Path<T>;
    control: Control<T>;
    label?: string;
    placeholder?: string;
    required?: boolean;
    defaultCountry?: string;
    onlyCR?: boolean;
    disabled?: boolean;
    className?: string;
}

export default function PhoneInputField<T extends FieldValues>({
    name,
    control,
    label = "Teléfono",
    placeholder = "Ingrese número de teléfono",
    required = false,
    defaultCountry = "CR",
    onlyCR = false,
    disabled = false,
    className = "",
}: PhoneInputFieldProps<T>) {
    return (
        <div className={className}>
            {label && (
                <label className="text-xs font-medium text-[var(--text-soft)] uppercase tracking-wide mb-2 block">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <Controller
                name={name}
                control={control}
                rules={{
                    required: required ? "El teléfono es obligatorio" : false,
                    validate: (value) => {
                        if (!value) return true;
                        if (!isValidPhoneNumber(value)) return "Número de teléfono inválido";
                        return true;
                    },
                }}
                render={({ field, fieldState: { error } }) => (
                    <>
                        <PhoneInput
                            international
                            defaultCountry={defaultCountry as any}
                            countries={onlyCR ? (["CR"] as any[]) : undefined}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={placeholder}
                            disabled={disabled}
                            className="custom-phone-input"
                            numberInputProps={{
                                className: `
                                    w-full h-11 
                                    bg-[var(--bg)] border border-[var(--border)] 
                                    rounded-xl px-4 text-sm
                                    focus:outline-none focus:border-[var(--accent)]
                                    disabled:opacity-60
                                `.trim(),
                            }}
                        />

                        {error && (
                            <p className="text-xs text-red-500 mt-1">{error.message}</p>
                        )}
                        {!error && field.value && isValidPhoneNumber(field.value) && (
                            <p className="text-xs text-emerald-500 mt-1">✓ Número válido</p>
                        )}

                        <p className="text-xs text-[var(--text-soft)] mt-1">
                            Formato internacional (ej: +506 8888 8888)
                        </p>
                    </>
                )}
            />
        </div>
    );
}