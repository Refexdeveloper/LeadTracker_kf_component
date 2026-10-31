import React, { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import LeadStatusTracker from '../../LeadStatusTracker.jsx'
import MyTeamFollowUpDetails from '../../MyTeamFollowUpDetails.jsx'
import { venwindOutlineBtnClass, venwindPrimaryBtnClass } from '../theme/ui.js'
import {
  VENWIND_ACCORDION_SECTIONS,
  VENWIND_ACCORDION_TAB_SHORT_LABELS,
  resolveVenwindAccordionTabForStage,
  venwindFieldHasValue,
  venwindSectionHasValues,
} from '../venwindLeadMap.js'

function venwindAccordionTabClass(active, themed) {
  return [
    'min-h-[40px] shrink-0 px-4 py-2 text-xs sm:text-sm rounded-full',
    'font-medium transition-all duration-[250ms] ease-out touch-manipulation border',
    'inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap',
    active
      ? themed
        ? 'border-[#0F766E] bg-[#0F766E] text-white font-semibold shadow-[0_1px_4px_rgba(15,118,110,0.16)]'
        : 'border-blue-600 bg-blue-600 text-white font-semibold shadow-sm'
      : themed
        ? 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F0FDFA] hover:text-[#134E4A] hover:border-[#0F766E]/20'
        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
  ].join(' ')
}

function venwindAccordionTabIconClass(active, themed) {
  if (!themed) return active ? 'text-white' : 'text-slate-500'
  return active ? 'text-white' : 'text-[#0F766E]'
}

function getVenwindFieldColClass(field) {
  if (field.className) return field.className
  if (field.type === 'textarea') {
    return 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4'
  }
  if (field.key === 'termSheetUpload' || field.key === 'additionalAttachedFiles') {
    return 'col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2'
  }
  return ''
}

const FIELD_GRID_CLASS =
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3'

function ReadOnlyField({ label, value, type = 'text', className = '', highlight = false, themed = false, dense = false }) {
  const raw = value != null && String(value).trim() !== '' ? String(value).trim() : ''
  const empty = !raw

  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      <div
        className={`rounded-lg border px-2.5 sm:px-3 py-2 sm:py-2.5 text-sm flex ${
          type === 'textarea'
            ? `items-start whitespace-pre-wrap break-words leading-relaxed ${dense ? 'min-h-[52px]' : 'min-h-[68px]'}`
            : `items-center break-words ${dense ? 'min-h-[36px]' : 'min-h-[40px]'}`
        } ${
          highlight
            ? themed
              ? 'border-[#0F766E]/15 bg-[#F0FDFA]/50 text-slate-900'
              : 'border-blue-100 bg-blue-50/50 text-slate-900'
            : 'border-slate-200/90 bg-slate-50/80 text-slate-900'
        }`}
      >
        {empty ? (
          <span className="text-slate-400">—</span>
        ) : type === 'email' ? (
          <a
            href={`mailto:${raw}`}
            className={`hover:underline break-all font-medium ${themed ? 'text-[#0F766E]' : 'text-blue-600'}`}
          >
            {raw}
          </a>
        ) : (
          <span className={highlight ? 'font-semibold' : ''}>{raw}</span>
        )}
      </div>
    </div>
  )
}

function SectionFields({ section, lead, themed }) {
  if (section.kind === 'activityTracking') {
    const followUps = Array.isArray(lead?.followUpDetails) ? lead.followUpDetails : []
    return (
      <div className="space-y-3">
        <div className={FIELD_GRID_CLASS}>
          {section.fields.map((field) => {
            const show = section.alwaysShow || venwindFieldHasValue(lead, field.key)
            if (!show) return null
            return (
              <ReadOnlyField
                key={field.key}
                label={field.label}
                value={lead[field.key]}
                type={field.type}
                highlight={field.highlight}
                themed={themed}
                dense
                className={getVenwindFieldColClass(field)}
              />
            )
          })}
        </div>
        <MyTeamFollowUpDetails rows={followUps} layout="auto" sectionTitle="Follow Up Details" compact />
      </div>
    )
  }

  return (
    <div className={FIELD_GRID_CLASS}>
      {section.fields.map((field) => {
        const show = section.alwaysShow || venwindFieldHasValue(lead, field.key)
        if (!show) return null
        return (
          <ReadOnlyField
            key={field.key}
            label={field.label}
            value={lead[field.key]}
            type={field.type}
            highlight={field.highlight}
            themed={themed}
            dense
            className={getVenwindFieldColClass(field)}
          />
        )
      })}
    </div>
  )
}

const sectionIcons = {
  'Lead Information': 'ri-file-list-3-line',
  'Introductory Documents Shared': 'ri-file-upload-line',
  'Initial Meeting Details': 'ri-calendar-event-line',
  'Requirement Assessment': 'ri-clipboard-line',
  'Customer Due Diligence and Visits': 'ri-map-pin-line',
  'Commercial Discussion': 'ri-handshake-line',
  'Term Sheet and Closure': 'ri-file-check-line',
  'Lead Activity Tracking': 'ri-pulse-line',
}

/**
 * Venwind accordion — workflow status tracker + stage-aligned detail tabs.
 */
export default function VWLeadAccordionPanel({
  lead,
  progressData,
  progressLoading = false,
  hideStatusTracker = false,
  sectionTitles = null,
  themed = false,
  onViewDetails = null,
  onCloseExpand = null,
}) {
  const [activeTab, setActiveTab] = useState('Lead Information')

  const sections = useMemo(
    () =>
      VENWIND_ACCORDION_SECTIONS.filter((section) => {
        if (Array.isArray(sectionTitles) && sectionTitles.length > 0 && !sectionTitles.includes(section.title)) {
          return false
        }
        return section.alwaysShow || venwindSectionHasValues(lead, section)
      }),
    [lead, sectionTitles],
  )

  useEffect(() => {
    if (!sections.length) {
      setActiveTab('')
      return
    }
    const stageTab = resolveVenwindAccordionTabForStage(lead?.currentStage)
    const preferred = sections.some((s) => s.title === stageTab) ? stageTab : sections[0].title
    setActiveTab(preferred)
  }, [lead?.id, lead?.currentStage, sections])

  if (!lead) return null

  const activeSection = sections.find((s) => s.title === activeTab) || sections[0]
  const showActions = typeof onViewDetails === 'function' || typeof onCloseExpand === 'function'

  return (
    <div className="space-y-3 p-3 sm:p-4">
      {!hideStatusTracker ? (
        <LeadStatusTracker
          lead={lead}
          progressData={progressData}
          progressLoading={progressLoading}
          layout="stepper"
          showHeader
          className={
            themed
              ? 'border-[#DCE7EC] shadow-[0_1px_3px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,118,110,0.04)]'
              : ''
          }
        />
      ) : null}

      {sections.length > 0 ? (
        <div
          className={`rounded-[18px] border overflow-hidden ${
            themed
              ? 'border-[#DCE7EC] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,118,110,0.04)]'
              : 'border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]'
          }`}
        >
          <div
            className={`flex flex-col gap-2 p-2 border-b sm:flex-row sm:items-center sm:justify-between ${
              themed ? 'border-[#DCE7EC] bg-[#FAFCFD]' : 'border-slate-200 bg-slate-50/80'
            }`}
          >
            <div
              className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0"
              role="tablist"
              aria-label="Lead detail sections"
            >
              {sections.map((section) => {
                const active = activeTab === section.title
                const tabLabel = VENWIND_ACCORDION_TAB_SHORT_LABELS[section.title] || section.title
                return (
                  <button
                    key={section.title}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    title={section.title}
                    onClick={() => setActiveTab(section.title)}
                    className={venwindAccordionTabClass(active, themed)}
                  >
                    {themed && sectionIcons[section.title] ? (
                      <i
                        className={`${sectionIcons[section.title]} text-sm shrink-0 ${venwindAccordionTabIconClass(active, themed)}`}
                        aria-hidden
                      />
                    ) : null}
                    <span>{tabLabel}</span>
                  </button>
                )
              })}
            </div>

            {showActions ? (
              <div className="flex flex-wrap items-center gap-2 shrink-0 sm:pl-2">
                {typeof onViewDetails === 'function' ? (
                  <button
                    type="button"
                    onClick={() => onViewDetails(lead)}
                    aria-label="Show more lead details"
                    className={
                      themed
                        ? venwindPrimaryBtnClass()
                        : 'min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all inline-flex items-center gap-2'
                    }
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    Show More
                  </button>
                ) : null}
                {typeof onCloseExpand === 'function' ? (
                  <button
                    type="button"
                    onClick={onCloseExpand}
                    aria-label="Hide lead details"
                    className={
                      themed
                        ? venwindOutlineBtnClass()
                        : 'min-h-[40px] px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm shadow-sm hover:bg-slate-50 hover:border-slate-400 transition-colors'
                    }
                  >
                    Hide
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {activeSection ? (
            <div className="p-3 sm:p-4" role="tabpanel" aria-label={activeSection.title}>
              <SectionFields section={activeSection} lead={lead} themed={themed} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
