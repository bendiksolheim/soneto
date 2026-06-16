import { useMemo } from "react";

type RouteStatsProps = {
  distance: number;
  paceInSeconds: number;
};

export function RouteStats({ distance, paceInSeconds }: RouteStatsProps): React.ReactElement {
  const time = useMemo(() => {
    return Number((distance * paceInSeconds) / 60).toFixed(0);
  }, [distance, paceInSeconds]);

  return (
    <>
      <div className="md:hidden text-sm whitespace-nowrap">
        {distance.toFixed(2)} km · {time} min
      </div>
      <div className="hidden md:block">
        <table className="w-full table-auto [&_:is(th)]:text-left [&_:is(td)]:text-right">
          <tbody>
            <tr>
              <th className="pr-4">Distanse</th>
              <td>{distance.toFixed(2)} km</td>
            </tr>
            <tr>
              <th>Tid</th>
              <td>{time} min</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
