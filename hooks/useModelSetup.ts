import { useEffect, useMemo, useState } from 'react';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { NitroModules } from 'react-native-nitro-modules';

export interface ModelMeta {
  numClasses: number;
  numDetections: number;
  transposed: boolean;
}

export function useModelSetup() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const model = useTensorflowModel(require('../assets/models/best.tflite'), []);
  const [modelMeta, setModelMeta] = useState<ModelMeta | null>(null);

  useEffect(() => {
    if (model.state === 'loaded') {
      const shape = model.model.outputs[0].shape;
      const dim1 = shape[1];
      const dim2 = shape[2];
      const transposed = dim1 > dim2;
      const numDetections = transposed ? dim1 : dim2;
      const numCols = transposed ? dim2 : dim1;
      setModelMeta({ numClasses: numCols - 4, numDetections, transposed });
    }
  }, [model.state, model.model]);

  const actualModel = model.state === 'loaded' ? model.model : undefined;
  const boxedModel = useMemo(
    () => (actualModel != null ? NitroModules.box(actualModel) : undefined),
    [actualModel],
  );

  return { modelState: model.state, modelMeta, boxedModel };
}
