<script lang="ts">
	// @ts-nocheck
	// Vendored Lao calendar module. Excluded from typechecking.
    import './style.css'
    import * as f from './script'
    import * as s from './constant'
    import {onMount} from 'svelte'
    import {getSetting, setSetting} from "../../utils/native";
    import {padZero} from './script'
    import WeekDays from "./WeekDays.svelte";

    let monthline, daynameline, holidayname, daylinelist, gooddaylist, gooddaysection, titlesection, gooddaypopup
    let day, month, year, weekday, direction, laoday, laomonth, laoyear, animalyear
    let SELECTEDMONTH = new Date()
    let isMinimized: boolean = false

    // Current States
    let currentYear = new Date().getFullYear()
    let currentMonth = 0

    let fullCalendarShown = false
    let selectYearPopupShown = false
    let goodDayPopupShown = false

    onMount(async () => {
        isMinimized = (await getSetting('minimizedCalendar')) === '1'
        buildCalendar()
    })

    function buildCalendar() {
        let today = new Date()
        buildMonth(today, daylinelist, false)

        let laodate = f.getLaoDate(today)
        monthline.innerText = f.t(s.MONTH_NAME_LIST)[today.getMonth()] + ' ' + today.getFullYear() + ' | ' + laodate.year

        let daynameline_str = ``
        for (let i = 0; i < 7; i++) {
            daynameline_str += `<div>` + f.t(s.DAY_LIST)[i] + `</div>`
        }

        daynameline.innerHTML = daynameline_str

        // Show today on calendar
        showDate(f.truncateTime(new Date()))

        // let selectitem = document.querySelectorAll('.selectitem')
        // selectitem.forEach((item) => {
        //   item.addEventListener('click', (e) => {
        //     let selectedYear = e.target.innerHTML
        //     showYear(parseInt(selectedYear))
        //     selectpopup.style.display = 'none'
        //   })
        // })

    }

    function showNextMonth() {
        if (currentMonth === 11) {
            if (currentYear === s.MAX_YEAR) return
            currentYear++
            currentMonth = 0
        } else {
            currentMonth++
        }
    }

    function showBackMonth() {
        if (currentMonth === 0) {
            if (currentYear === s.MIN_YEAR) return
            currentYear--
            currentMonth = 11
        } else {
            currentMonth--
        }
    }

    function viewMonths() {
        fullCalendarShown = true;
    }

    function showYear(year) {
        currentYear = year
        currentMonth = 0
        fullCalendarShown = true;
    }

    function showMonth() {
        // if (!SELECTEDMONTH) SELECTEDMONTH = new Date();
        if (!SELECTEDMONTH) SELECTEDMONTH = new Date()
        if (SELECTEDMONTH.getFullYear() === 2025) {
            let calendar_nav = document.querySelector('.calendar-nav') as HTMLElement
            let monthitem = document.querySelector('.monthitem') as HTMLElement
            calendar_nav.hidden = false
            monthitem.className = monthitem.className.replace(' active', '')
            let element = document.querySelector('.m' + SELECTEDMONTH.getFullYear() + '-' + SELECTEDMONTH.getMonth()) as HTMLElement
            if (SELECTEDMONTH.getMonth() === 0) {
                let nextmonth = document.querySelector('.m' + SELECTEDMONTH.getFullYear() + '-' + (SELECTEDMONTH.getMonth() + 1)) as HTMLElement
                nextmonth.className = nextmonth.className.replace(' active', '')
            } else if (SELECTEDMONTH.getMonth() === 11) {
                let lastmonth = document.querySelector('.m' + SELECTEDMONTH.getFullYear() + '-' + (SELECTEDMONTH.getMonth() - 1)) as HTMLElement
                lastmonth.className = lastmonth.className.replace(' active', '')
            } else {
                let nextmonth = document.querySelector('.m' + SELECTEDMONTH.getFullYear() + '-' + (SELECTEDMONTH.getMonth() + 1)) as HTMLElement
                let lastmonth = document.querySelector('.m' + SELECTEDMONTH.getFullYear() + '-' + (SELECTEDMONTH.getMonth() - 1)) as HTMLElement
                nextmonth.className = nextmonth.className.replace(' active', '')
                lastmonth.className = lastmonth.className.replace(' active', '')
            }
            element.className = element.className.replace(' actvie', '')
            element.className += ' active'
            // let monthlist = document.querySelector(".monthlist") as HTMLElement;
            // let monthSelected = document.querySelector(".month" + SELECTEDMONTH.getMonth()) as HTMLElement;
            // monthlist.scrollTop = (monthSelected.offsetTop-64);
        } else {
            showYear(SELECTEDMONTH.getFullYear())
        }
    }

    function showDate(date) {
        var isoDate = f.toIsoDate(date)
        var laodate = f.getLaoDate(date)
        var holiday = f.getHoliday(date)
        let dayitem = document.querySelector('.daylinelist div[data-date="' + isoDate + '"]') as HTMLDivElement
        let color = dayitem ? window.getComputedStyle(dayitem).getPropertyValue('color') : ''
        dayitem.style.borderRadius = '4px'
        if (dayitem) {
            dayitem.className = dayitem.className.replace('today selected', '')
            dayitem.className += ' today selected'
        }
        if (laodate.sin) document.querySelector('.bigday').classList.add('buddha')
        else document.querySelector('.bigday').classList.remove('buddha')
        let bigevent = document.querySelector('.bigevent') as HTMLElement
        if (holiday) {
            bigevent.hidden = false
            holidayname.innerText = holiday.name
            let isholiday = document.querySelector('.isholiday') as HTMLElement
            if (holiday.isholiday) {
                isholiday.hidden = false
            } else {
                isholiday.hidden = true
            }
        } else {
            bigevent.hidden = true
        }
        let gototoday = document.querySelector('.gototoday') as HTMLElement
        // if (f.compareDate(date, new Date()) === 0) gototoday.classList.add("hidden");
        // else gototoday.classList.remove("hidden");

        let bigday = document.querySelector('.bigday') as HTMLElement
        let bigmonthyear = document.querySelector('.bigmonthyear') as HTMLElement
        let bigweekday = document.querySelector('.bigweekday') as HTMLElement
        bigday.style.color = color
        bigmonthyear.style.color = color
        bigweekday.style.color = color

        day = ('0' + date.getDate()).substr(-2)
        month = ('0' + (date.getMonth() + 1)).substr(-2)
        year = date.getFullYear()
        weekday = f.t(s.DAY_FULL_LIST)[f.getDayOfWeek(date)]
        direction = laodate.direction === 'up' ? 'ຂຶ້ນ' : 'ແຮມ'
        laoday = laodate.day
        laomonth = laodate.month
        laoyear = laodate.year
        animalyear = f.getAnimalYear(date)

        document.querySelector('.day').innerHTML = day
        document.querySelector('.month').innerHTML = month
        document.querySelector('.year').innerHTML = year
        document.querySelector('.weekday').innerHTML = weekday
        document.querySelector('.direction').innerHTML = direction
        document.querySelector('.laoday').innerHTML = laoday
        document.querySelector('.laomonth').innerHTML = laomonth
        document.querySelector('.laoyear').innerHTML = laoyear
        document.querySelector('.animalyear').innerHTML = animalyear
    }

    function onBuildDayLine(node: HTMLElement, firstDateOfMonth: Date) {
        buildMonth(firstDateOfMonth, node, true)
        return {
            update: (newMonth: Date) => onBuildDayLine(node, newMonth),
        }
    }

    function buildMonth(date: Date, monthbox: HTMLElement, fullmode: boolean) {
        monthbox.innerHTML = ""
        var firstDayOfMonth = f.getFirstDayOfMonth(date)
        var firstCalendarDate = f.getFirstDayOfWeek(firstDayOfMonth)
        var thisMonth = date.getMonth()
        var dayIndex = 0
        var holidaylist = []
        while (true) {
            let dayline = document.createElement('div')
            dayline.className = 'dayline'
            for (var i = 0; i < 7; i++) {
                var dayItem = f.addDay(firstCalendarDate, dayIndex++)
                var laoDay = f.getLaoDate(dayItem)
                let dayitem = document.createElement('div')
                dayitem.setAttribute('data-date', f.toIsoDate(dayItem))
                dayitem.innerText = dayItem.getDate().toString()
                if (dayItem.getMonth() !== thisMonth) dayitem.className = ' othermonth'
                if (laoDay.sin) dayitem.className += ' buddha'
                var holiday = f.getHoliday(dayItem)
                if (holiday && dayItem.getMonth() === thisMonth) {
                    if (holiday.isholiday) dayitem.className += ' holiday'
                    else dayitem.className += ' eventday'
                    holiday.color = dayitem.style.color
                    holidaylist.push(holiday)
                }
                dayitem.addEventListener('click', (e) => {
                    if (e.target.className == 'laodayitem') {
                        let parentElement = e.target.parentElement
                        showDayPopup(parentElement.getAttribute('data-date'))
                    } else {
                        showDayPopup(e.target.getAttribute('data-date'))
                    }
                })

                if (fullmode) {
                    var goodDay = f.getGoodDay(dayItem, laoDay)
                    if (goodDay) {
                        var beliefclass = ''
                        if (
                            goodDay.filter(function (e) {
                                return e.good === 1
                            }).length > 0
                        )
                            beliefclass += ' good'
                        if (
                            goodDay.filter(function (e) {
                                return e.good === -1
                            }).length > 0
                        )
                            beliefclass += ' bad'
                        let element = document.createElement('div')
                        element.className = 'belieficon ' + beliefclass
                        dayitem.append(element)
                    }
                    let laodayitem = document.createElement('div')
                    laodayitem.className = 'laodayitem'
                    laodayitem.innerHTML = (laoDay.direction === 'up' ? 'ຂ&thinsp;' : 'ຮ&thinsp;') + laoDay.day + '/' + laoDay.month
                    dayitem.append(laodayitem)
                } else {
                    // if (compareDate(dayItem, date) === 0) $dayitem.addClass("today");
                    // $dayitem.click(function () {
                    //     var date = parseIsoDate($(this).data("date"));
                    //     showDate(date);
                    // });
                }
                dayline.append(dayitem)
            }
            monthbox.append(dayline)
            if (dayItem.getMonth() !== thisMonth) break
        }
        if (fullmode && holidaylist.length > 0) {
            let holidaylist_el = document.createElement('div')
            holidaylist_el.className = 'holidaylist'
            let holidaylist_str = ``
            holidaylist.forEach(function (e) {
                let strong = ''
                if (e.isholiday) strong = `class="strong"`
                holidaylist_str +=
                    `<div ` +
                    strong +
                    `><span style="color:` +
                    f.getColor(e.date, e.isholiday) +
                    `">` +
                    ('0' + e.date.getDate()).substr(-2) +
                    `</span>
                <span>` +
                    e.name +
                    `</span></div>`
            })
            holidaylist_el.innerHTML = holidaylist_str
            monthbox.append(holidaylist_el)
            // $monthbox.append($holidaylist);
        }
    }

    interface DAY_STRUCTURE {
        date: Date,
        laoDate: {
            day: number,
            month: number,
            year: number,
            sin: boolean,
            direction: string,
            laodayname: string,
            kaokong: string
        },
        goodDay?: {
            good: number,
            name: string,
            detail?: string
        }[],
        holiday?: {
            date: Date,
            isholiday: boolean
            name: string,
        }
    }

    let currentDay: DAY_STRUCTURE

    function showDayPopup(isoDate: string) {
        let date = f.parseIsoDate(isoDate);
        let laoDate = f.getLaoDate(date);
        currentDay = {
            date: date,
            laoDate: laoDate,
            holiday: f.getHoliday(date),
            goodDay: f.getGoodDay(date, laoDate)
        }

        goodDayPopupShown = true
    }

    async function toggleMinimizer() {
        isMinimized = !isMinimized
        await setSetting('minimizedCalendar', isMinimized ? '1' : '0')
    }

    function handleKeyDown(event) {
        if (event.key === 'Escape' && selectYearPopupShown) {
            selectYearPopupShown = false
        } else if (event.key === 'Escape' && goodDayPopupShown) {
            goodDayPopupShown = false
        } else if (event.key === 'Escape' && fullCalendarShown) {
            fullCalendarShown = false
        }
    }

</script>

<svelte:window on:keydown={handleKeyDown}/>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="calendarwidget flex-column overflow-hidden {isMinimized ? 'smallcalendar' : ''} rounded-xl">
    <div class="padding-8 flex-row">
        <div on:click={toggleMinimizer} class="minimizeCalendar"></div>
        <div class="todaypanel">
            <div class="bigday day"></div>
            <div class="bigmonthyear text-center">
                <span class="month"></span>
                /
                <span class="year"></span>
            </div>
            <div class="bigweekday weekday text-center"></div>
            <div class="biglaoday text-center">
                <span class="direction"></span>
                <span class="laoday"></span>
                ຄ່ຳ
            </div>
            <div class="biglaomonth text-center">
                ເດືອນ <span class="laomonth"></span>
                <span class="animalyear"></span>
            </div>
            <div class="bigevent">
                <span class="holidayname" bind:this={holidayname}></span>
                <span class="isholiday">
          {f.ts(s.BANK_HOLIDAY)}
        </span>
            </div>
        </div>

        <div class="calendarpanel">
            <div class="monthline" bind:this={monthline}></div>
            <div class="daynameline" bind:this={daynameline}></div>
            <div class="daylinelist" bind:this={daylinelist}></div>
            <div class="calendarbuttonpanel">
                <div on:click={() => showYear(2025)} class="viewmonths">
                    {f.ts(s.CALENDAR_2025)}
                </div>
                <div on:click={() => showYear(new Date().getFullYear())} class="viewmonths">
                    {f.ts(s.VIEW_OTHER_MONTHS)}
                </div>
            </div>
        </div>

        <div class="detailpanel">
            <div class="fulllaoday text-center">
                <span class="weekday">{weekday}</span>
                ,
                <span class="direction">{direction}</span>
                <span class="laoday">{laoday}</span>
                ຄ່ຳ
            </div>
            <div class="fulllaomonth text-center">
                ເດືອນ <span class="laomonth">{laomonth}</span>
                ລາວ,
                <span class="animalyear">{animalyear}</span>
                <span class="laoyear">{laoyear}</span>
            </div>
            <div class="calendarbuttonpanel">
                <div class="calendar2022">
                    {f.ts(s.CALENDAR)}
                    {currentYear}
                </div>
                <div on:click={viewMonths} class="viewmonths">
                    {f.ts(s.VIEW_OTHER_MONTHS)}
                </div>
            </div>
        </div>
    </div>
</div>

{#if selectYearPopupShown}
    <div id="selectpopup" class="popupcontainer" style="padding: 32px 64px" on:click={()=>selectYearPopupShown=false}>
        <div id="selectbox" class="popup">
            {#each [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] as year }
                <div class="selectitem text-center" on:click={() => {currentYear = year; selectYearPopupShown = false}}
                     role="button" on:keydown tabindex="-1">{year}</div>
            {/each}
        </div>
    </div>
{/if}
<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if goodDayPopupShown}
    <div id="gooddaypopup" class="popupcontainer" on:click={() => goodDayPopupShown = false} bind:this={gooddaypopup}
         role="button" on:keydown tabindex="-1">
        <div class="popup">
            <div class="titlesection" style:background-color={f.getColor(currentDay.date, false)}
                 bind:this={titlesection}>
                <p class="title">
          <span class="datelabel">
            {f.t(s.DAY_FULL_LIST)[f.getDayOfWeek(currentDay.date)]}
              {f.t([' ', ' ທີ '])}
          </span>
                    {f.padZero(currentDay.date.getDate())}
                    <span class="datelabel">
            {f.t(s.MONTH_NAME_LIST)[currentDay.date.getMonth()]}
          </span>
                    {currentDay.date.getFullYear()}
                <p class="subtitle">
                    {(currentDay.laoDate.direction === 'up' ? 'ຂຶ້ນ ' : 'ແຮມ ') + currentDay.laoDate.day + ' ຄ່ຳ' + ' ເດືອນ ' + currentDay.laoDate.month + ' ປີ ' + currentDay.laoDate.year}
                </p>
                {#if currentDay.holiday}
                    <p class="holidayline flex">
                        {f.t(['', 'ເປັນ'])}
                        {currentDay.holiday.name}
                    </p>
                {/if}
                <div class="laonamecontainer">
                    <div class="laonameitem text-center">
                        <h1>ມື້ລາວບູຮານ</h1>
                        <p class="laodayname">{ currentDay.laoDate.laodayname }</p>
                    </div>
                    <div class="laonameitem text-center">
                        <h1>ແຖວເກົ້າກອງ</h1>
                        <p class="kaokong">{ currentDay.laoDate.kaokong }</p>
                    </div>
                </div>
            </div>
            {#if currentDay.goodDay}
                <div class="gooddaysection" bind:this={gooddaysection}>
                    <p class="gooddaytitle">ຣືກຍາມບູຮານ:</p>
                    <ul id="gooddaylist" bind:this={gooddaylist}>
                        {#each currentDay.goodDay as gd}
                            <li>
                                {#if gd.good === 1}<span class="good">ດີ</span>
                                {:else}<span class="bad">ບໍ່ດີ</span>
                                {/if}
                                {gd.name}
                            </li>
                        {/each}
                    </ul>
                    <p class="gooddaycredit">ຕາມຕຳລາຫາຣືກຫາຍາມບູຮານລາວ ພິມຄັ້ງວັນທີ 15/09/2016</p>
                </div>
            {/if}
        </div>
    </div>
{/if}

{#if fullCalendarShown}
    <div class="absolute inset-0 bg-black/80 h-screen w-full" on:click={()=>fullCalendarShown = false}></div>
    <main class="monthpopup">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-01.jpg">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-02.jpg">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-03.jpg">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-04.jpg">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-05.jpg">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-06.jpg">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-07.jpg">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-08.jpg">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-09.jpg">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-10.jpg">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-11.jpg">
        <link rel="preload" as="image" href="https://public2.bcel.one/bcelone/calendar2025.2/cover-2025-12.jpg">

        <div class="monthtitle">
            <h1>
                {f.ts(s.CALENDAR)}
                <img class="backyear" src="ic_back_year.svg" alt="" on:click={() => showYear(currentYear-1)}
                     class:invisible={currentYear === s.MIN_YEAR}/>
                <span class="currentyear" on:click={() => selectYearPopupShown = true}>{currentYear}</span>
                <img class="nextyear" src="ic_next_year.svg" alt="" on:click={() => showYear(currentYear+1)}
                     class:invisible={currentYear === s.MAX_YEAR}/>
            </h1>
            <div class="closemonth" on:click={() => fullCalendarShown = false}></div>
        </div>

        {#if currentYear === 2025}
            <img src={`https://public2.bcel.one/bcelone/calendar2025.2/cover-${currentYear}-${padZero(currentMonth+1)}.jpg`}
                 alt="" class="flex-1 overflow-hidden object-cover mt-[-1px] current-year-calendar-img"/>
        {/if}

        <div class="monthlist" class:full={currentYear === 2025}>
            {#each Array(12) as _, i}
                <div class="monthitem" class:active={currentMonth === i}>
                    <div class="fullmonthline">
                        <div>{padZero(i + 1)} <span>{f.t(s.MONTH_NAME_LIST)[i]}</span></div>
                        <div>{currentYear} | {f.getLaoDate(new Date(currentYear, i, 1)).year}</div>
                    </div>
                    <div class="daynameline">
                        {#each f.t(s.DAY_LIST) as day}
                            <div>{day}</div>
                        {/each}
                    </div>
                    {#key currentYear}
                        <WeekDays monthDate={new Date(currentYear, i, 1)} fullmode={true}
                                  on:click={(e) => showDayPopup(f.toIsoDate(e.detail))}/>
                    {/key}
                </div>
            {/each}
        </div>

        <div class="monthremark">
            {f.ts(s.HOLIDAY_CAN_BE_CHANGED)}
        </div>

        {#if currentYear === 2025}
            <div class="calendar-nav">
                <div class="backmonth text-center flex-1 leading-[48px]" on:click={showBackMonth} role="button"
                     on:keydown tabindex="-1">
                    {f.ts(s.BACK)}
                </div>
                <!--      <div class="allmonth text-center flex-1 leading-[48px]" on:click={showAllMonths} role="button" on:keydown tabindex="-1">-->
                <!--        {f.ts(s.ALL)}-->
                <!--      </div>-->
                <div class="nextmonth text-center flex-1 leading-[48px]" on:click={showNextMonth} role="button"
                     on:keydown tabindex="-1">
                    {f.ts(s.NEXT)}
                </div>
            </div>
        {/if}
    </main>
{/if}
