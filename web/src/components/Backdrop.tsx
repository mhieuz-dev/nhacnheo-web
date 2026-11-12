import { useEffect, useState } from "react";
import { coverUrl } from "../lib/format";

export function Backdrop({ cover }: { cover?: string }) {
  const [layers, setLayers] = useState<{ current?: string; previous?: string }>({
    current: cover,
  });

  useEffect(() => {
    if (!cover) {
      setLayers({});
      return;
    }
    setLayers((previous) =>
      previous.current === cover
        ? previous
        : { previous: previous.current, current: cover },
    );
  }, [cover]);

  return (
    <div className="backdrop" aria-hidden="true">
      {layers.previous ? (
        <div
          className="backdrop-layer"
          style={{ backgroundImage: `url("${coverUrl(layers.previous, 240)}")` }}
        />
      ) : null}
      {layers.current ? (
        <div
          key={layers.current}
          className="backdrop-layer backdrop-layer-live"
          style={{ backgroundImage: `url("${coverUrl(layers.current, 240)}")` }}
        />
      ) : (
        <div className="backdrop-empty" />
      )}
      <div className="backdrop-shade" />
    </div>
  );
}
