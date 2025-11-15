import React from "react";

export default function Recent() {
  // Get the current date
  const current_date = new Date();

  // Format the date to the desired format: "Saturday, 13/12/2021"
  const formattedDate = current_date.toLocaleDateString('en-GB', {
    weekday: 'long',    // Full day name (e.g., Saturday)
    day: '2-digit',     // Day of the month (e.g., 13)
    month: '2-digit',   // Month (e.g., 12)
    year: 'numeric'     // Full year (e.g., 2021)
  });

  return (
    <>
      <section className="w-full flex items-center justify-center">

        {/*Today*/}
        <div className="w-full m-[9px]">
          <h1 className="font-medium text-[30px]">AttendEase</h1>
          <div className="font-medium">
            {formattedDate}
          </div>
        </div>

      </section>
    </>
  );
}
