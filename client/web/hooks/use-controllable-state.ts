import { useCallback, useEffect, useRef, useState } from "react";

type SetStateFn<T> = (value: T | ((prevState: T) => T)) => void;

interface UseControllableStateOptions<T> {
  prop?: T;
  defaultProp?: T;
  onChange?: (value: T) => void;
}

export function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: UseControllableStateOptions<T>): [T, SetStateFn<T>] {
  const [uncontrolledValue, setUncontrolledValue] = useState<T>(
    defaultProp as T
  );
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledValue;

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const setValue: SetStateFn<T> = useCallback(
    (nextValue) => {
      if (isControlled) {
        const setter = nextValue as (prevState: T) => T;
        const val =
          typeof nextValue === "function" ? setter(prop as T) : nextValue;
        if (val !== prop) {
          onChangeRef.current?.(val as T);
        }
      } else {
        setUncontrolledValue((prev) => {
          const setter = nextValue as (prevState: T) => T;
          const next =
            typeof nextValue === "function" ? setter(prev) : nextValue;
          if (next !== prev) {
            onChangeRef.current?.(next as T);
          }
          return next as T;
        });
      }
    },
    [isControlled, prop]
  );

  return [value as T, setValue];
}
