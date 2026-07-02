import { useEffect, useMemo, useState } from 'react';
import type { TfliteModel } from 'react-native-fast-tflite';
import { NitroModules } from 'react-native-nitro-modules';

export interface ModelMeta {
  numClasses: number;
  numDetections: number;
  transposed: boolean;
}

export function useModelSetup(model: TfliteModel | null) {
  const [modelMeta, setModelMeta] = useState<ModelMeta | null>(null);

  useEffect(() => {
    if (model != null) {
      try {
        const shape = model.outputs[0].shape;
        const dim1 = shape[1];
        const dim2 = shape[2];
        const transposed = dim1 > dim2;
        const numDetections = transposed ? dim1 : dim2;
        const numCols = transposed ? dim2 : dim1;
        setModelMeta({ numClasses: numCols - 4, numDetections, transposed });
      } catch (e) {
        console.error('[TFLite] Failed to read model shape:', e);
      }
    }
  }, [model]);

  const boxedModel = useMemo(
    () => (model != null ? NitroModules.box(model) : undefined),
    [model],
  );

  return { modelMeta, boxedModel };
}
