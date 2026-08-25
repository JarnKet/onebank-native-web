export interface Holiday {
  date: Date
  isholiday: boolean
  name: string
}

export interface LaoDay {
  month: number
  day: number
  direction: 'down' | 'up'
  year: number
  sin: boolean
  laodayname: string
  kaokong: string
}

export interface WeekDay {
  dayItem: Date
  laoDay: LaoDay
  holiday?: Holiday
  beliefclass?: string
}
