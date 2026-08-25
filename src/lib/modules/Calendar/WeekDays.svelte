<script lang="ts">
	// @ts-nocheck
	// Vendored Lao calendar module. Excluded from typechecking.
  import * as f from './script'
  import { createEventDispatcher, onMount } from 'svelte'
  import type {Holiday,WeekDay} from "./definition";

  const dispatch = createEventDispatcher<{click: Date}>()

  export let monthDate: Date = new Date()
  export let fullmode: boolean = false

  let thisMonth: number
  let holidaylist: Holiday[] = []
  let monthWeeks: WeekDay[][] = []

  onMount(() => {
    let firstDayOfMonth = f.getFirstDayOfMonth(monthDate)
    let firstCalendarDate = f.getFirstDayOfWeek(firstDayOfMonth)
    let dayIndex = 0
    console.log('WeekDays onMount', monthDate, firstCalendarDate)

    thisMonth = monthDate.getMonth()
    holidaylist = []
    monthWeeks = []

    let monthChanged = false;
    while (true){
      let weekDays: WeekDay[] = []
      for (let i = 0; i < 7; i++){
        let dayItem = f.addDay(firstCalendarDate, dayIndex++)
        let laoDay = f.getLaoDate(dayItem)
        let holiday = f.getHoliday(dayItem)
        if (holiday && dayItem.getMonth() === thisMonth) holidaylist.push(holiday)
        let weekDay: WeekDay = {dayItem, laoDay, holiday}
        if (dayItem.getMonth() !== thisMonth && monthWeeks.length > 3) monthChanged = true

        if (fullmode){
          let goodDay = f.getGoodDay(dayItem, laoDay)
          if (goodDay) {
            let beliefclass = ''
            if (goodDay.filter(e => e.good === 1 ).length > 0) beliefclass += ' good'
            if (goodDay.filter(e => e.good === -1 ).length > 0) beliefclass += ' bad'
            weekDay.beliefclass = beliefclass
          }
        }
        weekDays.push(weekDay)
      }
      monthWeeks.push(weekDays)
      if (monthChanged) break;
    }
  })

</script>

{#each monthWeeks as m}
  <div class="dayline">
  {#each m as w}
    <div
      data-date={f.toIsoDate(w.dayItem)}
      class:othermonth={w.dayItem.getMonth() !== thisMonth}
      class:buddha={w.laoDay.sin}
      class:holiday={w.holiday?.isholiday}
      class:eventday={w.holiday?.isholiday === false}
      style:color={f.getColor(w.dayItem, w.holiday?.isholiday)}
      on:click={() => dispatch('click', w.dayItem)}
      on:keydown
      tabindex="-1"
      role="button"
    >
      {w.dayItem.getDate().toString()}

      {#if fullmode}
        {#if w.beliefclass}
          <div class={"belieficon " + w.beliefclass}></div>
        {/if}
        <div class="laodayitem">
          {#if w.laoDay.direction === "up"}ຂ&thinsp;{:else}ຮ&thinsp;{/if}
          {w.laoDay.day}/{w.laoDay.month}
        </div>
      {/if}
    </div>
  {/each}
  </div>
{/each}

{#if fullmode && holidaylist.length > 0}
  <div class="holidaylist">
    {#each holidaylist as h}
      <div class="holidayitem" class:strong={h.isholiday}>
        <span style:color={f.getColor(h.date, h.isholiday)}>{f.padZero(h.date.getDate())}</span>
        <span>{h.name}</span>
      </div>
    {/each}
  </div>
{/if}
