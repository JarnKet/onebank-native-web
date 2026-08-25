// @ts-nocheck
// Vendored third-party code. Not maintained here and excluded from typechecking;
// see tsconfig.json / the migration plan.
// import { calendar } from './calendar'
import * as s from './constant'
import {calendar} from "./calendar";

const lang = parseInt(localStorage.getItem('lang') ?? '1')

export function t(stringList) {
  if (stringList === undefined) return []
  if (stringList.length <= lang) return stringList[0]
  else return stringList[lang]
}

export function ts(stringList: string[]) {
  return t(stringList)
}

export function getLaoDate(date: Date) {
  return calendar[toIsoDate(date)]
}

export function toIsoDate(date: Date) {
  return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).substr(-2) + '-' + ('0' + date.getDate()).substr(-2)
}
export function getHoliday(date: Date) {
  const isoDate = toIsoDate(date)
  const isoMonthDay = isoDate.substr(5)
  const laoDate = getLaoDate(date)
  const laoMonthDay = (laoDate.direction === 'up' ? 'ຂ' : 'ຮ') + laoDate.day + '/' + laoDate.month

  for (let i = 0; i < s.HOLIDAY_LIST.length; i++) {
    const h = s.HOLIDAY_LIST[i]
    if ((h.year && isoDate === h.year + '-' + h.monthday) || (!h.year && isoMonthDay === h.monthday) || laoMonthDay === h.laoday) {
      return {
        date: date,
        isholiday: h.isholiday === 1,
        name: t([h.englishname, h.laoname]),
      }
    }
  }
  return undefined
}
export function compareDate(date1: Date, date2: Date) {
  if (truncateTime(date1).getTime() < truncateTime(date2).getTime()) return -1
  else if (truncateTime(date1).getTime() > truncateTime(date2).getTime()) return 1
  else return 0
}
export function truncateTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getDayOfWeek(date: Date) {
  var weekday = date.getDay() - 1 // Sunday is the first, so we push back one day to make Monday the first
  if (weekday === -1) weekday = 6
  return weekday
}

export function getAnimalYear(date: Date) {
  return t(s.ANIMAL_YEAR_LIST)[(date.getFullYear() - 2012 - (date.getMonth() < 3 ? 1 : 0)) % 12] // Lao animal year change on April
}
export function getFirstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
export function getFirstDayOfWeek(date: Date) {
  var weekday = getDayOfWeek(date)
  return addDay(date, -weekday)
}
export function addDay(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta)
}
export function parseIsoDate(str: string): Date {
  return new Date(parseInt(str.substr(0, 4)), parseInt(str.substr(5, 2)) - 1, parseInt(str.substr(8, 2)))
}

export function getGoodDay(date: Date, laodate) {
  var res = []
  for (var belief of s.BELIEF_LIST) {
    var matched = true

    for (var b of belief.daylist) {
      if (matched && b.laoday) {
        matched = false
        for (var ld of b.laoday) {
          var laodayupdown = (ld.direction === 'up' ? 'u' : 'd') + laodate.day
          if (laodayupdown === ld.laoday || laodate.day === ld.laoday) {
            matched = true
            break
          }
        }
      }

      if (matched && b.laomonth) {
        matched = false
        for (var lm of b.laomonth) {
          if (laodate.month === lm) {
            matched = true
            break
          }
        }
      }

      if (matched && b.laodayname) {
        matched = false
        for (var ldn of b.laodayname) {
          if (laodate.laodayname.indexOf(ldn) !== -1) {
            matched = true
            break
          }
        }
      }

      if (matched && b.weekday) {
        matched = false
        for (var wd of b.weekday) {
          if (date.getDay() === wd) {
            matched = true
            break
          }
        }
      }

      if (matched) {
        res.push({ good: belief.good, name: belief.laoname, detail: belief.detail })
        break
      }
    }
  }
  if (res.length > 0) {
    res = res.sort(function (a, b) {
      return b.good - a.good
    })
    return res
  }
}
export function padZero(num) {
  return ('0' + num).substr(-2)
}
export function getColor(date, isholiday) {
  if (isholiday) return '#b71c1c'
  switch (date.getDay()) {
    case 1:
      return '#1b5e20'
    case 2:
      return '#006064'
    case 3:
      return '#1a237e'
    case 4:
      return '#311b92'
    case 5:
      return '#4a148c'
    case 6:
      return '#880e4f'
    case 0:
      return '#b71c1c'
  }
}
export function addMonth(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, date.getDate())
}
