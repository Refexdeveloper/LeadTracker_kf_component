import React from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { enterpriseTheme } from './enterpriseTheme.js'
import { EnterprisePageRoot } from './EnterpriseDataTable.jsx'
import { EnterprisePageHeader, EnterprisePageTitle } from './EnterprisePageShell.jsx'
import { EnterpriseKpiGrid } from './EnterpriseKpiCard.jsx'
import { MOCK_USER } from './enterpriseMockData.js'

/**
 * Shared enterprise page frame — matches VMS2.0 / ContractsMyItemsPro layout.
 */
export default function EnterprisePageFrame({
  pageTitle,
  pageSubtitle,
  pageDescription = null,
  headerVariant = 'greeting',
  kpis,
  kpiColumns,
  toolbar = null,
  children,
  user = MOCK_USER,
}) {
  return (
    <ThemeProvider theme={enterpriseTheme}>
      <CssBaseline />
      <EnterprisePageRoot>
        {headerVariant === 'none' ? null : headerVariant === 'title' ? (
          <EnterprisePageTitle title={pageTitle} subtitle={pageDescription || pageSubtitle} />
        ) : (
          <EnterprisePageHeader title={pageTitle} subtitle={pageSubtitle} user={user} />
        )}
        {kpis?.length ? <EnterpriseKpiGrid items={kpis} columns={kpiColumns} /> : null}
        {toolbar}
        {children}
      </EnterprisePageRoot>
    </ThemeProvider>
  )
}
