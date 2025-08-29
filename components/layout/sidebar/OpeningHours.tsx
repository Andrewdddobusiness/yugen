export const OpeningHours = ({
  currentOpeningHours,
}: {
  currentOpeningHours: any;
}) => {
  if (!currentOpeningHours || !currentOpeningHours.weekdayDescriptions) {
    return <p>Opening hours not available</p>;
  }

  return (
    <div>
      {currentOpeningHours.weekdayDescriptions.map(
        (day: string, index: number) => (
          <p key={index}>{day}</p>
        )
      )}
    </div>
  );
};
