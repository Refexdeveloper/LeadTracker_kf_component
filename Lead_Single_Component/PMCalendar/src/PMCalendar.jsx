import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import { kf as kfImport, KissflowSDKContext } from './sdk/index.js'
import {
  buildContractAdminApiPaths,
  resolveKfContractApplicationId,
  resolveKfContractProcessId,
} from './kfContractPaths.js'
import { resolveKfAccountId } from './kfLeadPaths.js'
import {
  buildPmCalendarPreviewEvents,
  fetchContractAdminItems,
  mapAdminRowsToPmEvents,
} from './pmCalendarApi.js'
import {
  buildMonthOptionsFromEvents,
  parseMonthKey,
  toMonthKey,
} from './pmCalendarMap.js'
import EnterprisePageFrame from './mui/EnterprisePageFrame.jsx'
import { EnterpriseSectionShell } from './mui/EnterprisePageShell.jsx'
import { enterpriseOutlinedButtonSx } from './mui/EnterpriseActionBar.jsx'
import { ENTERPRISE_SURFACES } from './mui/enterpriseSurfaces.js'
import { ENTERPRISE_BRAND } from './mui/enterpriseTheme.js'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PM_CALENDAR_POPUP_ID = 'Popup_dGv6sKXNzW'

function buildMonthCells(year, month, events) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const cells = []
  for (let i = 0; i < first.getDay(); i += 1) cells.push(null)
  for (let d = 1; d <= last.getDate(); d += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, iso, events: events.filter((e) => e.date === iso) })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function isSameDay(iso, date) {
  const d = new Date(iso)
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  )
}

function EventPill({ label, title, onClick }) {
  return (
    <Box
      component="button"
      type="button"
      title={title || label}
      onClick={onClick}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        px: 0.75,
        py: 0.25,
        mb: 0.35,
        borderRadius: 9999,
        fontSize: '0.625rem',
        fontWeight: 600,
        lineHeight: 1.3,
        color: ENTERPRISE_BRAND.primaryDark,
        bgcolor: ENTERPRISE_BRAND.soft,
        border: `1px solid ${ENTERPRISE_BRAND.border}`,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 2px 6px rgba(0,134,201,0.12)',
          bgcolor: ENTERPRISE_BRAND.muted,
        },
      }}
    >
      {label}
    </Box>
  )
}

export default function PMCalendar() {
  const { kf: kfFromCtx, sdkReady } = useContext(KissflowSDKContext) || {}
  const kfRef = useRef(kfFromCtx || (typeof kfImport !== 'undefined' ? kfImport : null) || (typeof window !== 'undefined' ? window.kf : null))

  useEffect(() => {
    kfRef.current = kfFromCtx || kfRef.current
  }, [kfFromCtx])

  const today = useMemo(() => new Date(), [])
  const [viewDate, setViewDate] = useState(() => new Date())
  const [allEvents, setAllEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [usingMockData, setUsingMockData] = useState(false)

  const contractIdsSig = useMemo(
    () =>
      `${resolveKfAccountId(kfFromCtx)}|${resolveKfContractApplicationId(kfFromCtx)}|${resolveKfContractProcessId(kfFromCtx)}`,
    [kfFromCtx, sdkReady],
  )

  const pmFetchSigRef = useRef('')
  const pmDataLoadedSigRef = useRef('')
  const pmFetchInFlightRef = useRef(false)
  const pmShowSpinnerRef = useRef(true)

  useEffect(() => {
    if (!sdkReady) return

    const paths = buildContractAdminApiPaths(kfRef.current)
    if (!paths) {
      setLoading(false)
      setFetchError('Kissflow paths unavailable')
      return
    }

    const fetchSig = `${paths.accountId}|${paths.applicationId}|${paths.processId}`
    if (fetchSig !== pmFetchSigRef.current) {
      pmFetchSigRef.current = fetchSig
      pmDataLoadedSigRef.current = ''
      pmShowSpinnerRef.current = true
      setAllEvents([])
    }
    if (pmDataLoadedSigRef.current === fetchSig || pmFetchInFlightRef.current) return

    let cancelled = false
    pmFetchInFlightRef.current = true
    if (pmShowSpinnerRef.current) setLoading(true)
    setFetchError(null)

    async function run() {
      try {
        const list = await fetchContractAdminItems(kfRef.current, paths, { pageNumber: 1, pageSize: 100000 })
        if (cancelled) return
        const mapped = mapAdminRowsToPmEvents(list)
        setAllEvents(mapped)
        setUsingMockData(false)
        pmDataLoadedSigRef.current = fetchSig
        if (mapped.length === 0) {
          setFetchError('No contracts with Upcoming PM Day found')
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('PM Calendar fetch failed:', e?.message || e)
          setFetchError(e?.message || 'Failed to load PM schedules')
          setAllEvents(buildPmCalendarPreviewEvents())
          setUsingMockData(true)
        }
      } finally {
        pmFetchInFlightRef.current = false
        if (!cancelled) {
          setLoading(false)
          pmShowSpinnerRef.current = false
        }
      }
    }

    run()
    return () => {
      cancelled = true
      pmFetchInFlightRef.current = false
    }
  }, [sdkReady, contractIdsSig])

  useEffect(() => {
    if (sdkReady) return undefined
    if (!import.meta.env?.DEV) return undefined
    const timer = setTimeout(() => {
      setAllEvents(buildPmCalendarPreviewEvents())
      setUsingMockData(true)
      setLoading(false)
    }, 3500)
    return () => clearTimeout(timer)
  }, [sdkReady])

  const monthKey = toMonthKey(viewDate.getFullYear(), viewDate.getMonth())

  const monthOptions = useMemo(
    () => buildMonthOptionsFromEvents(allEvents, viewDate),
    [allEvents, viewDate],
  )

  const monthEvents = useMemo(() => {
    const prefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`
    return allEvents.filter((e) => e.date.startsWith(prefix))
  }, [allEvents, viewDate])

  const calendarCells = useMemo(
    () => buildMonthCells(viewDate.getFullYear(), viewDate.getMonth(), monthEvents),
    [viewDate, monthEvents],
  )

  const openContractPopup = useCallback((row) => {
    const kfLocal = kfRef.current || (typeof window !== 'undefined' ? window.kf : null)
    const instanceId = row?.instanceId || row?.id
    const activityInstanceId = row?.activityInstanceId || ''
    const activityId = activityInstanceId || ''

    if (!kfLocal?.app?.page?.openPopup) {
      console.warn('PM Calendar: Kissflow openPopup is not available')
      return
    }
    if (!instanceId || !activityId) {
      console.warn('PM Calendar: missing required popup params', { instanceId, activityId, activityInstanceId, row })
      return
    }

    try {
      const p = kfLocal.app.page.openPopup(PM_CALENDAR_POPUP_ID, {
        ActivityID: String(activityId),
        InstanceId: String(instanceId),
        ActivityInstanceId: String(activityInstanceId || activityId),
        ActivityId: String(activityId),
        activityId: String(activityId),
        InstanceID: String(instanceId),
        width: 960,
        height: 720,
        popupWidth: '960px',
        popupHeight: '720px',
      })
      if (p && typeof p.catch === 'function') {
        p.catch((e) => console.warn('PM Calendar popup failed:', e?.message || e))
      }
    } catch (e) {
      console.warn('PM Calendar popup failed:', e?.message || e)
    }
  }, [])

  const goPrevMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  const goNextMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const handleMonthSelect = (key) => {
    const { year, month } = parseMonthKey(key)
    setViewDate(new Date(year, month, 1))
  }

  const calendarHeaderControls = (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 148 } }}>
        <Select
          value={monthOptions.some((o) => o.value === monthKey) ? monthKey : monthOptions[0]?.value || monthKey}
          onChange={(e) => handleMonthSelect(e.target.value)}
          sx={{
            minHeight: 32,
            fontSize: '0.8125rem',
            borderRadius: 9999,
            bgcolor: '#fff',
            fontWeight: 600,
            '& .MuiSelect-select': { py: 0.75 },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
          }}
        >
          {monthOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8125rem' }}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Stack direction="row" spacing={0.5}>
        <IconButton
          size="small"
          onClick={goPrevMonth}
          sx={{
            width: 32,
            height: 32,
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            bgcolor: '#fff',
            '&:hover': { bgcolor: ENTERPRISE_BRAND.soft, borderColor: ENTERPRISE_BRAND.border },
          }}
        >
          <ChevronLeftIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={goNextMonth}
          sx={{
            width: 32,
            height: 32,
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            bgcolor: '#fff',
            '&:hover': { bgcolor: ENTERPRISE_BRAND.soft, borderColor: ENTERPRISE_BRAND.border },
          }}
        >
          <ChevronRightIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>
      <Button
        variant="outlined"
        size="small"
        startIcon={<TodayIcon sx={{ fontSize: 16 }} />}
        onClick={goToday}
        sx={{
          ...enterpriseOutlinedButtonSx,
          minHeight: { xs: 36, md: 32 },
          px: 1.25,
          fontSize: '0.75rem',
          '& .MuiButton-startIcon': { mr: 0.5 },
        }}
      >
        Today
      </Button>
    </Stack>
  )

  return (
    <EnterprisePageFrame headerVariant="none">
      {usingMockData ? (
        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#a16207', fontWeight: 600 }}>
          Preview mode — showing sample data. Connect in Kissflow for live PM schedules.
        </Typography>
      ) : null}
      {fetchError && !usingMockData ? (
        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#64748b' }}>
          {fetchError}
        </Typography>
      ) : null}

      <EnterpriseSectionShell
        headerControls={calendarHeaderControls}
        subtitle={`${monthEvents.length} PM event${monthEvents.length === 1 ? '' : 's'} scheduled`}
        headerSx={{ py: { xs: 1, sm: 1.25 }, gap: 1 }}
        controlsWrapSx={{ mb: 0.35 }}
        subtitleSx={{ mt: 0, fontSize: '0.75rem', lineHeight: 1.35 }}
      >
        <Paper
          elevation={0}
          sx={{
            ...ENTERPRISE_SURFACES.tableContainer,
            position: 'relative',
            borderColor: 'rgba(203,213,225,0.95)',
          }}
        >
          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
              <CircularProgress size={36} sx={{ color: ENTERPRISE_BRAND.primary }} />
              <Typography variant="body2" sx={{ mt: 1.5, color: '#64748b' }}>
                {sdkReady ? 'Loading PM schedules…' : 'Connecting to Kissflow…'}
              </Typography>
            </Stack>
          ) : (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  borderBottom: '1px solid #dde3ef',
                  bgcolor: ENTERPRISE_BRAND.tableHead,
                }}
              >
                {WEEKDAYS.map((d) => (
                  <Typography
                    key={d}
                    variant="caption"
                    align="center"
                    sx={{
                      py: 0.85,
                      color: ENTERPRISE_BRAND.tableHeadText,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {d}
                  </Typography>
                ))}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
                {calendarCells.map((cell, idx) => {
                  const isToday = cell && isSameDay(cell.iso, today)
                  const visibleEvents = cell?.events?.slice(0, 3) ?? []
                  const moreCount = (cell?.events?.length ?? 0) - visibleEvents.length

                  return (
                    <Box
                      key={cell?.iso || `empty-${idx}`}
                      sx={{
                        minHeight: { xs: 56, sm: 68, md: 76 },
                        borderRight: '1px solid #dde3ef',
                        borderBottom: '1px solid #dde3ef',
                        bgcolor: cell ? '#fff' : '#f4f6f8',
                        p: { xs: 0.5, sm: 0.7 },
                        opacity: cell ? 1 : 0.45,
                        transition: 'background-color 0.15s ease',
                        '&:hover': cell ? { bgcolor: ENTERPRISE_BRAND.soft } : undefined,
                        ...(isToday
                          ? {
                              boxShadow: `inset 0 0 0 2px ${ENTERPRISE_BRAND.primary}`,
                              bgcolor: `${ENTERPRISE_BRAND.soft}cc`,
                            }
                          : {}),
                      }}
                    >
                      {cell ? (
                        <>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 24,
                              height: 24,
                              px: 0.5,
                              borderRadius: 9999,
                              fontWeight: 700,
                              color: isToday ? '#fff' : '#334155',
                              bgcolor: isToday ? ENTERPRISE_BRAND.primary : 'transparent',
                              mb: 0.5,
                            }}
                          >
                            {cell.day}
                          </Typography>
                          <Box sx={{ mt: 0.25 }}>
                            {visibleEvents.map((ev) => (
                              <EventPill
                                key={ev.id}
                                label={ev.badgeLabel || ev.title}
                                title={`${ev.title}${ev.vendor && ev.vendor !== '—' ? ` — ${ev.vendor}` : ''}`}
                                onClick={() => openContractPopup(ev)}
                              />
                            ))}
                            {moreCount > 0 ? (
                              <Typography
                                component="button"
                                type="button"
                                variant="caption"
                                onClick={() => {
                                  if (cell.events[0]) openContractPopup(cell.events[0])
                                }}
                                sx={{
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  color: ENTERPRISE_BRAND.primaryDark,
                                  fontWeight: 600,
                                  pl: 0.5,
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                              >
                                +{moreCount} more
                              </Typography>
                            ) : null}
                          </Box>
                        </>
                      ) : null}
                    </Box>
                  )
                })}
              </Box>
            </>
          )}
        </Paper>
      </EnterpriseSectionShell>
    </EnterprisePageFrame>
  )
}
