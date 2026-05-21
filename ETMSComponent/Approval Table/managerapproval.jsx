import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import { Table, Space, Button, Typography, Skeleton, Pagination, Image, Tooltip } from 'antd';
import { ReactComponent as EmptyState } from './Images/noData.svg';
import { CheckOutlined,CloseOutlined } from '@ant-design/icons';
import userimg_img from "./Images/userimg.png";
import open from "./Images/open.png";

const { Title } = Typography;
const itemsPerPage = 5;

const ManagerApproval = () => {
  console.log("in export function, setting state variables");

  const kf = window.kf;
  const application_id = kf.app._id;
  const account_id = kf.account._id;
  const user_role = kf.user.Role.Name;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [ids, setIds] = useState({});
  const [currentIds, setCurrentIds] = useState({});
 
  const [url, setUrl] = useState('');
  const [tableColumns, setTableColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [emptyicon, setemptyicon] = useState('none');
  const [noData, setNoData] = useState({});
  const [fieldsToDisplay, setFieldsToDisplay] = useState([]);

  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalAdvances, setTotalAdvances] = useState(0);
  const [totalTravels, setTotalTravels] = useState(0);
  const [totalCancelTravels, setTotalCancelTravels] = useState(0);

  const [watchParamFlag, setWatchParamFlag] = useState(0);
  const [paginationTotal, setPaginationTotal] = useState(0);

  const popupIds = {
    'expense' : 'Popup_x8cKrc27X',
    'advance' : 'Popup_6tbqOy8Ah',
    'travel' : 'Popup_UHCabQrVq'
  }
  const [newFormPopupId, setNewFormPopupId] = useState('');

  const randNum = useRef(0);

  useEffect(() => {
    console.log("in user_role useEffect, user_role = ", user_role);
    if(user_role === "Travel admin"){
      setActiveTab("travel");
    }
    else{
      setActiveTab("expense");
    }
  }, [user_role]);

  useEffect(() => {
    setLoading(true);
    fetchCounts();
  }, [watchParamFlag])

  useEffect(() => {
    const kf = window.kf;
    kf.context.watchParams(function (data) {
      console.log("Approval table: watchParams data --> ",data);
        setWatchParamFlag(data.dashboardRandNum);

        randNum.current = data.dashboardRandNum;
    });

  }, [])

  useEffect(() => {
    if(activeTab !== ''){
      console.log("in activeTab useEffect, activeTab = ", activeTab);
      fetchCounts();
    }
  }, [activeTab]);

  const fetchIds = async () => {
    console.log("--in fetchIds--");
    const kf = window.kf;

    let ids = {}, names = {};

    if(user_role === "Manager" || user_role === "Admin"){
      ids = {
        expense_process_id : await kf.app.getVariable("expense_process_id"),
        expense_report_id : await kf.app.getVariable("expensePendingTasks_report_id"),
        advance_process_id : await kf.app.getVariable("advance_process_id"),
        advance_report_id : await kf.app.getVariable("advancePendingTasks_report_id"),
        travel_process_id : await kf.app.getVariable("travel_process_id"),
        travel_report_id : await kf.app.getVariable("travelPendingTasks_report_id"),
      };
      
      names = {
        expense_process_name : 'Expense Management',
        expense_report_name : 'Manager: Pending tasks',
        advance_process_name : 'Advance Payment Request Process',
        advance_report_name : 'Manager: Pending tasks',
        travel_process_name : 'Travel Management',
        travel_report_name : 'Manager: Pending tasks'
      }
    }
    else if(user_role === "Finance manager"){
      ids = {
        expense_process_id : await kf.app.getVariable("expense_process_id"),
        expense_report_id : await kf.app.getVariable("expensePendingTasks_report_id"),
        advance_process_id : await kf.app.getVariable("advance_process_id"),
        advance_report_id : await kf.app.getVariable("advancePendingTasks_report_id")
      };
      
      names = {
        expense_process_name : 'Expense Management',
        expense_report_name : 'FM: Pending tasks',
        advance_process_name : 'Advance Payment Request Process',
        advance_report_name : 'FM: Pending tasks'
      }
    }
    else if(user_role === "Travel admin"){
      ids = {
        travel_process_id : await kf.app.getVariable("travel_process_id"),
        travel_report_id : await kf.app.getVariable("travelPendingTasks_report_id"),
      };
      
      names = {
        travel_process_name : 'Travel Management',
        travel_report_name : 'TA: Pending tasks'
      }
    }
    else if(user_role === "Employee"){
      ids = {
        expense_process_id : await kf.app.getVariable("expense_process_id"),
        expense_report_id : await kf.app.getVariable("expensePendingTasks_report_id"),
        advance_process_id : await kf.app.getVariable("advance_process_id"),
        advance_report_id : await kf.app.getVariable("advancePendingTasks_report_id"),
        travel_process_id : await kf.app.getVariable("travel_process_id"),
        travel_report_id : await kf.app.getVariable("travelPendingTasks_report_id"),
      };
      
      names = {
        expense_process_name : 'Expense Management',
        expense_report_name : 'My Items report',
        advance_process_name : 'Advance Payment Request Process',
        advance_report_name : 'My Items report',
        travel_process_name : 'Travel Management',
        travel_report_name : 'My Items report - Not condition'
      }
    }
    
    const allIdsFetched = Object.values(ids).every(id => id !== undefined && id !== '');
    if (allIdsFetched) {
      console.log("In allIdsFetched");
      console.log("ids =", ids);
      setIds(ids);
      return ids;
    }
    console.log("Fetching missing ids");

    const application_id = kf.app._id;
    const account_id = kf.account._id;

    let process_list;
    if (!ids.expense_process_id || ids.expense_process_id === '' || !ids.advance_process_id || ids.advance_process_id === '' || !ids.travel_process_id || ids.travel_process_id === '') {
      process_list = await kf.api(`/flow/2/${account_id}/process?_application_id=${application_id}`);

      if (!ids.expense_process_id || ids.expense_process_id === '') {
        const process_info = process_list.find(itm => itm.Name === names["expense_process_name"]);
        ids["expense_process_id"] = process_info?._id;
        console.log('Fetched expense_process_id:', ids.expense_process_id);
  
        kf.app.setVariable("expense_process_id", ids.process_id);
      }
  
      if (!ids.advance_process_id || ids.advance_process_id === '') {
        const process_info = process_list.find(itm => itm.Name === names["advance_process_name"]);
        ids["advance_process_id"] = process_info?._id;
        console.log('Fetched advance_process_id:', ids.advance_process_id);
      
        kf.app.setVariable("advance_process_id", ids.process_id);
      }
  
      if (!ids.travel_process_id || ids.travel_process_id === '') {
        const process_info = process_list.find(itm => itm.Name === names["travel_process_name"]);
        ids["travel_process_id"] = process_info?._id;
        console.log('Fetched travel_process_id:', ids.travel_process_id);
      
        kf.app.setVariable("travel_process_id", ids.process_id);
      }
    }

    if(!ids.expense_report_id || ids.expense_report_id === ''){

      const expense_report_response = await kf.api(`/flow/2/${account_id}/process/${ids.expense_process_id}/report?_application_id=${application_id}`);
      console.log('Fetched expense_report_response:', expense_report_response);
    
      const expense_report_info = expense_report_response.find(item => item.Name === names["expense_report_name"]);
    
      if (expense_report_info) {
        ids["expense_report_id"] = expense_report_info._id;
        console.log('Fetched expense_report_id:', ids.expense_report_id);
    
        kf.app.setVariable("expensePendingTasks_report_id", ids.expense_report_id);
      
      } 
      else {
        console.log('expense_report_id not found.');
      }
    }

    if(!ids.advance_report_id || ids.advance_report_id === ''){

      const advance_report_response = await kf.api(`/flow/2/${account_id}/process/${ids.advance_process_id}/report?_application_id=${application_id}`);
      console.log('Fetched advance_report_response:', advance_report_response);
    
      const advance_report_info = advance_report_response.find(item => item.Name === names["advance_report_name"]);
    
      if (advance_report_info) {
        ids["advance_report_id"] = advance_report_info._id;
        console.log('Fetched advance_report_id:', ids.advance_report_id);
    
        kf.app.setVariable("advancePendingTasks_report_id", ids.advance_report_id);
      
      } 
      else {
        console.log('advance_report_id not found.');
      }
    }

    if(!ids.travel_report_id || ids.travel_report_id === ''){

      const travel_report_response = await kf.api(`/flow/2/${account_id}/process/${ids.travel_process_id}/report?_application_id=${application_id}`);
      console.log('Fetched travel_report_response:', travel_report_response);
    
      const travel_report_info = travel_report_response.find(item => item.Name === names["travel_report_name"]);
    
      if (travel_report_info) {
        ids["travel_report_id"] = travel_report_info._id;
        console.log('Fetched travel_report_id:', ids.travel_report_id);
    
        kf.app.setVariable("travelPendingTasks_report_id", ids.travel_report_id);
      
      } 
      else {
        console.log('travel_report_id not found.');
      }
    }

    const allIdsFetchedFinal = Object.values(ids).every(id => id !== undefined && id !== '');
    if (allIdsFetchedFinal) {
      console.log("In allIdsFetchedFinal");
      console.log("ids =", ids);
      setIds(ids);
      return ids;
    }
    else {
      throw new Error('One or more IDs not found in API responses.');
    }

  };

  const fetchDashboardIds = async () => {
    console.log("in fetchDashboardIds");
  
    let dbIds = {}, names = {};

    if((user_role === "Manager" || user_role === "Admin")){
      dbIds = {
        expenseToBePaid_report_id : await kf.app.getVariable('expenseToBePaid_report_id'),
        expensePaidCount_report_id : await kf.app.getVariable('expensePaidCount_report_id'),
        expensePaidAmount_report_id : await kf.app.getVariable('expensePaidAmount_report_id'),
        advanceToBePaid_report_id : await kf.app.getVariable('advanceToBePaid_report_id'),
        advancePaidCount_report_id : await kf.app.getVariable('advancePaidCount_report_id'),
        advancePaidAmount_report_id : await kf.app.getVariable('advancePaidAmount_report_id'),
        travelTotal_report_id : await kf.app.getVariable('travelTotal_report_id'),
        travelApprovedCount_report_id : await kf.app.getVariable('travelApprovedTasks_report_id')
      }
  
      names = {
        expenseToBePaid_report_name : 'Manager: Expense to be approved',
        expensePaidCount_report_name : 'Manager: Completed tasks',
        expensePaidAmount_report_name : 'Manager: Expense approved',
        advanceToBePaid_report_name : 'Manager: Advance to be approved',
        advancePaidCount_report_name : 'Manager: Completed tasks',
        advancePaidAmount_report_name : 'Manager: Advance approved',
        travelTotal_report_name : 'Manager: Total tasks',
        travelApprovedCount_report_name : 'Manager: Approved tasks'
      }
    }
    else if(user_role === "Finance manager"){
      dbIds = {
        expenseToBePaid_report_id : await kf.app.getVariable('expenseToBePaid_report_id'),
        expensePaidCount_report_id : await kf.app.getVariable('expensePaidCount_report_id'),
        expensePaidAmount_report_id : await kf.app.getVariable('expensePaidAmount_report_id'),
        advanceToBePaid_report_id : await kf.app.getVariable('advanceToBePaid_report_id'),
        advancePaidCount_report_id : await kf.app.getVariable('advancePaidCount_report_id'),
        advancePaidAmount_report_id : await kf.app.getVariable('advancePaidAmount_report_id'),
      }
  
      names = {
        expenseToBePaid_report_name : 'FM: Expense amount to be approved',
        expensePaidCount_report_name : 'FM: Completed tasks',
        expensePaidAmount_report_name : 'FM: Expense approved',
        advanceToBePaid_report_name : 'FM: Advance to be approved',
        advancePaidCount_report_name : 'FM: Completed tasks',
        advancePaidAmount_report_name : 'FM: Advance approved'
      }
    }
    else if(user_role === "Travel admin"){
      dbIds = {
        TA_dashboard_report_id : await kf.app.getVariable('TA_dashboard_report_id'),
        rejectedTasks_report_id : await kf.app.getVariable('travelRejectedTasks_report_id'),
      }
  
      names = {
        TA_dashboard_report_name : 'TA: Dashboard travel requests',
        rejectedTasks_report_name : 'TA: Cancelled tasks'
      }
    }
    else if(user_role === "Employee"){  
      dbIds = {
        myItems_report_id : await kf.app.getVariable('travelMyItems_report_id'),
        myItemsNot_report_id : await kf.app.getVariable('travelmyItemsNot_report_id'),
      }
  
      names = {
        myItems_report_name : 'My Items report',
        myItemsNot_report_name : 'My Items report - Not condition'
      }
    }
  
    const allIdsFetched = Object.values(dbIds).every(id => id !== undefined && id !== '');
    console.log("Checked wheather all dashboard IdsFetched = ",allIdsFetched);
    if (allIdsFetched) {
      console.log("In all dashboard IdsFetched");
      console.log("dashboard dbIds =", dbIds);
  
      setIds(dbIds);
      setCurrentPage(1);
  
      return dbIds;
    }
  
    console.log("Not all dashboard dbIds are fetched");
  
    if((user_role === "Manager" || user_role === "Admin" || user_role === "Finance manager")){
      if(!dbIds.expenseToBePaid_report_id || dbIds.expenseToBePaid_report_id === '' || !dbIds.expensePaidCount_report_id || dbIds.expensePaidCount_report_id === '' || !dbIds.expensePaidAmount_report_id || dbIds.expensePaidAmount_report_id === ''){
  
        const expense_report_response = await kf.api(`/flow/2/${account_id}/process/${ids.expense_process_id}/report?_application_id=${application_id}`);
        console.log('Fetched expense_report_response:', expense_report_response);
      
        if(!dbIds.expenseToBePaid_report_id || dbIds.expenseToBePaid_report_id === ''){
          const expense_report_info = expense_report_response.find(item => item.Name === names["expenseToBePaid_report_name"]);
        
          if (expense_report_info) {
            dbIds["expenseToBePaid_report_id"] = expense_report_info._id;
            console.log('Fetched expenseToBePaid_report_id:', dbIds.expenseToBePaid_report_id);
        
            kf.app.setVariable("expenseToBePaid_report_id", dbIds.expenseToBePaid_report_id);
          
          } 
          else {
            console.log('expenseToBePaid_report_id not found.');
          }
        }
    
        if(!dbIds.expensePaidCount_report_id || dbIds.expensePaidCount_report_id === ''){
          const expense_report_info = expense_report_response.find(item => item.Name === names["expensePaidCount_report_name"]);
        
          if (expense_report_info) {
            dbIds["expensePaidCount_report_id"] = expense_report_info._id;
            console.log('Fetched expensePaidCount_report_id:', dbIds.expensePaidCount_report_id);
        
            kf.app.setVariable("expensePaidCount_report_id", dbIds.expensePaidCount_report_id);
          
          } 
          else {
            console.log('expensePaidCount_report_id not found.');
          }
        }
    
        if(!dbIds.expensePaidAmount_report_id || dbIds.expensePaidAmount_report_id === ''){
          const expense_report_info = expense_report_response.find(item => item.Name === names["expensePaidAmount_report_name"]);
        
          if (expense_report_info) {
            dbIds["expensePaidAmount_report_id"] = expense_report_info._id;
            console.log('Fetched expensePaidAmount_report_id:', dbIds.expensePaidAmount_report_id);
        
            kf.app.setVariable("expensePaidAmount_report_id", dbIds.expensePaidAmount_report_id);
          
          } 
          else {
            console.log('expensePaidAmount_report_id not found.');
          }
        }
      }
  
      if(!dbIds.advanceToBePaid_report_id || dbIds.advanceToBePaid_report_id === '' || !dbIds.advancePaidCount_report_id || dbIds.advancePaidCount_report_id === '' || !dbIds.advancePaidAmount_report_id || dbIds.advancePaidAmount_report_id === ''){
  
        const advance_report_response = await kf.api(`/flow/2/${account_id}/process/${ids.advance_process_id}/report?_application_id=${application_id}`);
        console.log('Fetched advance_report_response:', advance_report_response);
      
        if(!dbIds.advanceToBePaid_report_id || dbIds.advanceToBePaid_report_id === ''){
          const advance_report_info = advance_report_response.find(item => item.Name === names["advanceToBePaid_report_name"]);
        
          if (advance_report_info) {
            dbIds["advanceToBePaid_report_id"] = advance_report_info._id;
            console.log('Fetched advanceToBePaid_report_id:', dbIds.advanceToBePaid_report_id);
        
            kf.app.setVariable("advanceToBePaid_report_id", dbIds.advanceToBePaid_report_id);
          
          } 
          else {
            console.log('advanceToBePaid_report_id not found.');
          }
        }
    
        if(!dbIds.advancePaidCount_report_id || dbIds.advancePaidCount_report_id === ''){
          const advance_report_info = advance_report_response.find(item => item.Name === names["advancePaidCount_report_name"]);
        
          if (advance_report_info) {
            dbIds["advancePaidCount_report_id"] = advance_report_info._id;
            console.log('Fetched advancePaidCount_report_id:', dbIds.advancePaidCount_report_id);
        
            kf.app.setVariable("advancePaidCount_report_id", dbIds.advancePaidCount_report_id);
          
          } 
          else {
            console.log('advancePaidCount_report_id not found.');
          }
        }
    
        if(!dbIds.advancePaidAmount_report_id || dbIds.advancePaidAmount_report_id === ''){
          const advance_report_info = advance_report_response.find(item => item.Name === names["advancePaidAmount_report_name"]);
        
          if (advance_report_info) {
            dbIds["advancePaidAmount_report_id"] = advance_report_info._id;
            console.log('Fetched advancePaidAmount_report_id:', dbIds.advancePaidAmount_report_id);
        
            kf.app.setVariable("advancePaidAmount_report_id", dbIds.advancePaidAmount_report_id);
          
          } 
          else {
            console.log('advancePaidAmount_report_id not found.');
          }
        }
      }
  
      if(user_role !== "Finance manager"){
        if(!dbIds.travelTotal_report_id || dbIds.travelTotal_report_id === '' || !dbIds.travelApprovedCount_report_id || dbIds.travelApprovedCount_report_id === ''){
  
          const travel_report_response = await kf.api(`/flow/2/${account_id}/process/${ids.travel_process_id}/report?_application_id=${application_id}`);
          console.log('Fetched travel_report_response:', travel_report_response);
        
          if(!dbIds.travelTotal_report_id || dbIds.travelTotal_report_id === ''){
            const travel_report_info = travel_report_response.find(item => item.Name === names["travelTotal_report_name"]);
          
            if (travel_report_info) {
              dbIds["travelTotal_report_id"] = travel_report_info._id;
              console.log('Fetched travelTotal_report_id:', dbIds.travelTotal_report_id);
          
              kf.app.setVariable("travelTotal_report_id", dbIds.travelTotal_report_id);
            
            } 
            else {
              console.log('travelTotal_report_id not found.');
            }
          }
          
          if(!dbIds.travelApprovedCount_report_id || dbIds.travelApprovedCount_report_id === ''){
            const travel_report_info = travel_report_response.find(item => item.Name === names["travelApprovedCount_report_name"]);
          
            if (travel_report_info) {
              dbIds["travelApprovedCount_report_id"] = travel_report_info._id;
              console.log('Fetched travelApprovedCount_report_id:', dbIds.travelApprovedCount_report_id);
          
              kf.app.setVariable("travelApprovedTasks_report_id", dbIds.travelApprovedCount_report_id);
            
            } 
            else {
              console.log('travelApprovedTasks_report_id not found.');
            }
          }
      
        }
        
      }
    }
    else if(user_role === "Travel admin"){
      if(!dbIds.TA_dashboard_report_id || dbIds.TA_dashboard_report_id === ''){
  
        const travel_report_response = await kf.api(`/flow/2/${account_id}/process/${ids.travel_process_id}/report?_application_id=${application_id}`);
        console.log('Fetched travel_report_response:', travel_report_response);
      
        if(!dbIds.TA_dashboard_report_id || dbIds.TA_dashboard_report_id === ''){
          const travel_report_info = travel_report_response.find(item => item.Name === names["TA_dashboard_report_name"]);
        
          if (travel_report_info) {
            dbIds["TA_dashboard_report_id"] = travel_report_info._id;
            console.log('Fetched TA_dashboard_report_id:', dbIds.TA_dashboard_report_id);
        
            kf.app.setVariable("TA_dashboard_report_id", dbIds.TA_dashboard_report_id);
          
          } 
          else {
            console.log('TA_dashboard_report_id not found.');
          }
        }

        if(!dbIds.rejectedTasks_report_id || dbIds.rejectedTasks_report_id === ''){
  
          const travel_report_response = await kf.api(`/flow/2/${account_id}/process/${ids.travel_process_id}/report?_application_id=${application_id}`);
          console.log('Fetched travel_report_response:', travel_report_response);
        
          if(!dbIds.rejectedTasks_report_id || dbIds.rejectedTasks_report_id === ''){
            const travel_report_info = travel_report_response.find(item => item.Name === names["rejectedTasks_report_name"]);
          
            if (travel_report_info) {
              dbIds["rejectedTasks_report_id"] = travel_report_info._id;
              console.log('Fetched rejectedTasks_report_id:', dbIds.rejectedTasks_report_id);
          
              kf.app.setVariable("travelRejectedTasks_report_id", dbIds.rejectedTasks_report_id);
            
            } 
            else {
              console.log('rejectedTasks_report_id not found.');
            }
          }
        
        }
      
      }
    }
    else if(user_role === "Employee"){
      if(!dbIds.myItems_report_id || dbIds.myItems_report_id === ''){
    
        const travel_report_response = await kf.api(`/flow/2/${account_id}/process/${ids.travel_process_id}/report?_application_id=${application_id}`);
        console.log('Fetched travel_report_response:', travel_report_response);
      
        if(!dbIds.myItems_report_id || dbIds.myItems_report_id === ''){
          const travel_report_info = travel_report_response.find(item => item.Name === names["myItems_report_name"]);
        
          if (travel_report_info) {
            dbIds["myItems_report_id"] = travel_report_info._id;
            console.log('Fetched myItems_report_id:', dbIds.myItems_report_id);
        
            kf.app.setVariable("travelMyItems_report_id", dbIds.myItems_report_id);
          
          } 
          else {
            console.log('travelMyItems_report_id not found.');
          }
        }
    
        if(!dbIds.myItemsNot_report_id || dbIds.myItemsNot_report_id === ''){
    
          const travel_report_response = await kf.api(`/flow/2/${account_id}/process/${ids.travel_process_id}/report?_application_id=${application_id}`);
          console.log('Fetched travel_report_response:', travel_report_response);
        
          if(!dbIds.myItemsNot_report_id || dbIds.myItemsNot_report_id === ''){
            const travel_report_info = travel_report_response.find(item => item.Name === names["myItemsNot_report_name"]);
          
            if (travel_report_info) {
              dbIds["myItemsNot_report_id"] = travel_report_info._id;
              console.log('Fetched myItemsNot_report_id:', dbIds.myItemsNot_report_id);
          
              kf.app.setVariable("travelmyItemsNot_report_id", dbIds.myItemsNot_report_id);
            
            } 
            else {
              console.log('travelmyItemsNot_report_id not found.');
            }
          }
        
        }
      
      }
    }

    const allIdsFetchedFinal = Object.values(dbIds).every(id => id !== undefined && id !== '');
    if (allIdsFetchedFinal) {
      console.log("In all dashboard IdsFetchedFinal");

      setIds(dbIds);
      setCurrentPage(1);

      return dbIds;
    }
    else {
      throw new Error('One or more dashboard IDs not found in API responses.');
    }
  }

  const refreshDashboardData = async (process_id) => {

    const dbIds = await fetchDashboardIds();
    console.log("in refreshDashboardData, dbIds = ",dbIds);

    console.log("Refreshing dashboard card values, process_id = ", process_id, " user_role = ", user_role);
  
    if((user_role === "Manager" || user_role === "Admin")){

      if(process_id.includes("Expense")){
        // ------------Expense: To be approved---------------
        kf.api(`/process-report/2/${account_id}/${ids.expense_process_id}/${ids.expense_report_id}/count`)
        .then(async (pendingExpCount) => {
          kf.app.setVariable("expense_to_be_paid_count", pendingExpCount.Count);
          console.log("expense_to_be_paid_count = ",pendingExpCount);
        })
        .catch((err) => {
          console.log(err);
        });
  
        // ---------------------------
        kf.api(`/process-report/2/${account_id}/${ids.expense_process_id}/${dbIds.expenseToBePaid_report_id}?_application_id=${application_id}`)
        .then(async (pendingExpResp) => {
          const col_current_month = pendingExpResp.Values.find(col => col.FieldId === 'Actual_reimbursement_amount').Id;
          let value = 0;
          for (let i in pendingExpResp.Data) {
            let currentrowdata = pendingExpResp.Data[i];
            value = currentrowdata[col_current_month];
          }
          value = Math.round(value);
          console.log("expense_to_be_paid_amount", value);
          kf.app.setVariable("expense_to_be_paid_amount", value);
        })
        .catch((err) => {
          console.log(err);
        });
  
        // ------------Expense: Approved---------------
        kf.api(`/process-report/2/${account_id}/${ids.expense_process_id}/${dbIds.expensePaidCount_report_id}/count`)
        .then(async (approvedExpCount) => {
          console.log("expense_paid_count = ",approvedExpCount);
          kf.app.setVariable("expense_paid_count", approvedExpCount.Count);
        })
        .catch((err) => {
          console.log(err);
        });
  
        // ---------------------------
        kf.api(`/process-report/2/${account_id}/${ids.expense_process_id}/${dbIds.expensePaidAmount_report_id}?_application_id=${application_id}`)
        .then(async (approvedExpResp) => {
          const col_current_month = approvedExpResp.Values.find(col => col.FieldId === 'Actual_reimbursement_amount').Id;
          let value = 0;
          for (let i in approvedExpResp.Data) {
            let currentrowdata = approvedExpResp.Data[i];
            value = currentrowdata[col_current_month];
            //const amount = value[col_current_month]
          }
          value = Math.round(value);
          console.log("expense_paid_amount", value);
          kf.app.setVariable("expense_paid_amount", value);
        })
        .catch((err) => {
          console.log(err);
        });
      }
      else if(process_id.includes("Advance")){
        // ------------Advance: To be approved---------------
        kf.api(`/process-report/2/${account_id}/${ids.advance_process_id}/${ids.advance_report_id}/count`)
        .then(async (paidAdvCount) => {
          console.log("advance_to_be_paid_count = ",paidAdvCount);
          kf.app.setVariable("advance_to_be_paid_count", paidAdvCount.Count);
        })
        .catch((err) => {
          console.log(err);
        });
        // ----------------------------------------------------------------
        kf.api(`/process-report/2/${account_id}/${ids.advance_process_id}/${dbIds.advanceToBePaid_report_id}?_application_id=${application_id}`)
        .then(async (pendingAdvResp) => {
          const col_current_month = pendingAdvResp.Values.find(col => col.FieldId === 'Advance_Amount').Id;
          let value = 0;
          for (let i in pendingAdvResp.Data) {
            let currentrowdata = pendingAdvResp.Data[i];
            value = currentrowdata[col_current_month];
          }
          value = Math.round(value);
          console.log("advance_to_be_paid_amount", value);
          kf.app.setVariable("advance_to_be_paid_amount", value);
        })
        .catch((err) => {
          console.log(err);
        });
  
        // ------------Advance: Approved---------------
  
        kf.api(`/process-report/2/${account_id}/${ids.advance_process_id}/${dbIds.advancePaidCount_report_id}/count`)
        .then(async (paidAdvCount) => {
          console.log("advance_paid_count = ",paidAdvCount);
          kf.app.setVariable("advance_paid_count", paidAdvCount.Count);
        })
        .catch((err) => {
          console.log(err);
        });
        // ----------------------------------------------------------------
  
        kf.api(`/process-report/2/${account_id}/${ids.advance_process_id}/${dbIds.advancePaidAmount_report_id}?_application_id=${application_id}`)
        .then(async (approvedAdvResp) => {
          const col_current_month = approvedAdvResp.Values.find(col => col.FieldId === 'Advance_Amount').Id;
          let value=0;
          for (let i in approvedAdvResp.Data) {
            let currentrowdata = approvedAdvResp.Data[i];
            value = currentrowdata[col_current_month];
          }
          console.log("advance_paid_amount", value);
          kf.app.setVariable("advance_paid_amount", value);
        })
        .catch((err) => {
          console.log(err);
        });
      }
      else if(process_id.includes("Travel")){
        // ------------Travel---------------
        kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.travelTotal_report_id}/count`)
        .then(async (totalTravCount) => {
          console.log("total_travel_request = ",totalTravCount);
          kf.app.setVariable("total_travel_request", totalTravCount.Count);
        })
        .catch((err) => {
          console.log(err);
        });
        // ----------------------------------------------------------------
        kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${ids.travel_report_id}/count`)
        .then(async (pendTravReq) => {
          console.log("pending_travel_request = ",pendTravReq);
          kf.app.setVariable("pending_travel_request", pendTravReq.Count);
        })
        .catch((err) => {
          console.log(err);
        });
        // ----------------------------------------------------------------
        setTimeout(() => {
          kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.travelApprovedCount_report_id}/count`)
          .then(async (approvedTravCount) => {
            console.log("approved_travel_request = ",approvedTravCount);
            kf.app.setVariable("approved_travel_request", approvedTravCount.Count);
          })
          .catch((err) => {
            console.log(err);
          });
        }, 1000)
      }
    }
    else if(user_role === "Finance manager"){
  
      if(process_id.includes("Expense")){
        // ------------Expense: To be approved---------------
        kf.api(`/process-report/2/${account_id}/${ids.expense_process_id}/${ids.expense_report_id}/count`)
        .then(async (pendingExpCount) => {
          kf.app.setVariable("expense_to_be_paid_count", pendingExpCount.Count);
          console.log("expense_to_be_paid_count = ",pendingExpCount);
        })
        .catch((err) => {
          console.log(err);
        });
  
        // ---------------------------
        kf.api(`/process-report/2/${account_id}/${ids.expense_process_id}/${dbIds.expenseToBePaid_report_id}?_application_id=${application_id}`)
        .then(async (pendingExpResp) => {
          const col_current_month = pendingExpResp.Values.find(col => col.FieldId === 'Actual_reimbursement_amount').Id;
          let value = 0;
          for (let i in pendingExpResp.Data) {
            let currentrowdata = pendingExpResp.Data[i];
            value = currentrowdata[col_current_month];
          }
          value = Math.round(value);
          console.log("expense_to_be_paid_amount", value);
          kf.app.setVariable("expense_to_be_paid_amount", value);
        })
        .catch((err) => {
          console.log(err);
        });
  
        // ------------Expense: Approved---------------
        kf.api(`/process-report/2/${account_id}/${ids.expense_process_id}/${dbIds.expensePaidCount_report_id}/count`)
        .then(async (approvedExpCount) => {
          console.log("expense_paid_count = ",approvedExpCount);
          kf.app.setVariable("expense_paid_count", approvedExpCount.Count);
        })
        .catch((err) => {
          console.log(err);
        });
  
        // ---------------------------
        kf.api(`/process-report/2/${account_id}/${ids.expense_process_id}/${dbIds.expensePaidAmount_report_id}?_application_id=${application_id}`)
        .then(async (approvedExpResp) => {
          const col_current_month = approvedExpResp.Values.find(col => col.FieldId === 'Actual_reimbursement_amount').Id;
          let value = 0;
          for (let i in approvedExpResp.Data) {
            let currentrowdata = approvedExpResp.Data[i];
            value = currentrowdata[col_current_month];
            //const amount = value[col_current_month]
          }
          value = Math.round(value);
          console.log("expense_paid_amount", value);
          kf.app.setVariable("expense_paid_amount", value);
        })
        .catch((err) => {
          console.log(err);
        });
      }
      else if(process_id.includes("Advance")){
        // ------------Advance: To be approved---------------
        kf.api(`/process-report/2/${account_id}/${ids.advance_process_id}/${ids.advance_report_id}/count`)
        .then(async (paidAdvCount) => {
          console.log("advance_to_be_paid_count = ",paidAdvCount);
          kf.app.setVariable("advance_to_be_paid_count", paidAdvCount.Count);
        })
        .catch((err) => {
          console.log(err);
        });
        // ----------------------------------------------------------------
        kf.api(`/process-report/2/${account_id}/${ids.advance_process_id}/${dbIds.advanceToBePaid_report_id}?_application_id=${application_id}`)
        .then(async (pendingAdvResp) => {
          const col_current_month = pendingAdvResp.Values.find(col => col.FieldId === 'Advance_Amount').Id;
          let value = 0;
          for (let i in pendingAdvResp.Data) {
            let currentrowdata = pendingAdvResp.Data[i];
            value = currentrowdata[col_current_month];
          }
          value = Math.round(value);
          console.log("advance_to_be_paid_amount", value);
          kf.app.setVariable("advance_to_be_paid_amount", value);
        })
        .catch((err) => {
          console.log(err);
        });
  
        // ------------Advance: Approved---------------
  
        kf.api(`/process-report/2/${account_id}/${ids.advance_process_id}/${dbIds.advancePaidCount_report_id}/count`)
        .then(async (paidAdvCount) => {
          console.log("advance_paid_count = ",paidAdvCount);
          kf.app.setVariable("advance_paid_count", paidAdvCount.Count);
        })
        .catch((err) => {
          console.log(err);
        });
        // ----------------------------------------------------------------
  
        kf.api(`/process-report/2/${account_id}/${ids.advance_process_id}/${dbIds.advancePaidAmount_report_id}?_application_id=${application_id}`)
        .then(async (approvedAdvResp) => {
          const col_current_month = approvedAdvResp.Values.find(col => col.FieldId === 'Advance_Amount').Id;
          let value=0;
          for (let i in approvedAdvResp.Data) {
            let currentrowdata = approvedAdvResp.Data[i];
            value = currentrowdata[col_current_month];
          }
          console.log("advance_paid_amount", value);
          kf.app.setVariable("advance_paid_amount", value);
        })
        .catch((err) => {
          console.log(err);
        });
      }
    }
    else if(user_role === "Travel admin"){
  
      if(process_id.includes("Travel")){
  
        // ------------International Total & Acknowledged---------------
        kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.TA_dashboard_report_id}/count?$domesticinternational=International&$current_step=Booked`)
        .then(async (interBookedCountResp) => {
          let interBookedCount = interBookedCountResp.Count;
          console.log("interBookedCount = ",interBookedCount);

          kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.TA_dashboard_report_id}/count?$domesticinternational=International&$status=Completed`)
          .then(async (intercompletedCountResp) => {
            let interCompletedCount = intercompletedCountResp.Count;
            console.log("interCompletedCount = ",interCompletedCount);

            kf.app.setVariable("trav_international_approved", interBookedCount + interCompletedCount);
            console.log("trav_international_approved = ",interBookedCount + interCompletedCount);

            kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${ids.travel_report_id}/count?$domesticinternational=International`)
            .then(async (interPendingCountResp) => {
              let interPendingCount = interPendingCountResp.Count;
              console.log("interPendingCount = ",interPendingCount);

              kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.rejectedTasks_report_id}/count?$domesticinternational=International`)
              .then((interCancelledCountResp) => {
                  let interCancelledCount = interCancelledCountResp.Count;
                  console.log("interCancelledCount = ",interCancelledCount);

                  kf.app.setVariable("trav_international_total", interBookedCount + interCompletedCount + interPendingCount);
                  console.log("trav_international_total = ",interBookedCount + interCompletedCount + interPendingCount);

              }).catch((err) => {
                console.log("error getting trav_international_total : ",err);
              });
            })
            .catch((err) => {
              console.log("error getting trav_international_total : ",err);
            });

          })
          .catch((err) => {
            console.log("error getting trav_international_approved : ",err);
          });
        })
        .catch((err) => {
          console.log(err);
        });

        // ------------International Modification---------------
        kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${ids.travel_report_id}/count?$domesticinternational=International&$is_this_a_modification_request=Yes&$cancel_request=No`)
        .then(async (interModificationCount) => {
          kf.app.setVariable("trav_international_modified", interModificationCount.Count);
          console.log("trav_international_modified = ",interModificationCount);
        })
        .catch((err) => {
          console.log("error getting trav_international_modified : ",err);
        });

        // ------------International Cancellation---------------
        kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${ids.travel_report_id}/count?$domesticinternational=International&$cancel_request=Yes`)
        .then(async (interCancellationCount) => {
          kf.app.setVariable("trav_international_cancelled", interCancellationCount.Count);
          console.log("trav_international_cancelled = ",interCancellationCount);
        })
        .catch((err) => {
          console.log("error getting trav_international_cancelled : ",err);
        });
  
        // ------------Domestic Total & Acknowledged---------------
        kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.TA_dashboard_report_id}/count?$domesticinternational=Domestic&$current_step=Booked`)
        .then(async (domesticBookedCountResp) => {
          let domesticBookedCount = domesticBookedCountResp.Count;
          console.log("domesticBookedCount = ",domesticBookedCount);
        
          kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.TA_dashboard_report_id}/count?$domesticinternational=Domestic&$status=Completed`)
          .then(async (domesticcompletedCountResp) => {
            let domesticCompletedCount = domesticcompletedCountResp.Count;
            kf.app.setVariable("trav_domestic_approved", domesticCompletedCount);
            console.log("domesticCompletedCount = ",domesticCompletedCount);
        
            console.log("trav_domestic_approved = ",domesticBookedCount + domesticCompletedCount);
        
            kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${ids.travel_report_id}/count?$domesticinternational=Domestic`)
            .then(async (domesticPendingCountResp) => {
              let domesticPendingCount = domesticPendingCountResp.Count;
              console.log("domesticPendingCount = ",domesticPendingCount);
              
              kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.rejectedTasks_report_id}/count?$domesticinternational=Domestic`)
              .then((domesticCancelledCountResp) => {
                  let domesticCancelledCount = domesticCancelledCountResp.Count;
                  console.log("domesticCancelledCount = ",domesticCancelledCount);
        
                  kf.app.setVariable("trav_domestic_total", domesticBookedCount + domesticCompletedCount + domesticPendingCount);
                  console.log("trav_domestic_total = ",domesticBookedCount + domesticCompletedCount + domesticPendingCount);
        
              }).catch((err) => {
                console.log("error getting trav_domestic_total : ",err);
              });
        
            })
            .catch((err) => {
              console.log("error getting trav_domestic_total : ",err);
            });
        
          })
          .catch((err) => {
            console.log("error getting trav_domestic_approved : ",err);
          });
        })
        .catch((err) => {
          console.log(err);
        });

        // ------------Domestic Modification---------------
        kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${ids.travel_report_id}/count?$domesticinternational=Domestic&$is_this_a_modification_request=Yes&$cancel_request=No`)
        .then(async (domesticModificationCount) => {
          kf.app.setVariable("trav_domestic_modified", domesticModificationCount.Count);
          console.log("trav_domestic_modified = ",domesticModificationCount);
        })
        .catch((err) => {
          console.log("error getting trav_domestic_modified : ",err);
        });

        // ------------Domestic Cancellation---------------
        kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${ids.travel_report_id}/count?$domesticinternational=Domestic&$cancel_request=Yes`)
        .then(async (domesticCancellationCount) => {
          kf.app.setVariable("trav_domestic_cancelled", domesticCancellationCount.Count);
          console.log("trav_domestic_cancelled = ",domesticCancellationCount);
        })
        .catch((err) => {
          console.log("error getting trav_domestic_cancelled : ",err);
        });
      }
  
    }else if(user_role === "Employee"){
      // -----------My travel requests----------------
      let myPendTravReq = await kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.myItemsNot_report_name}/count`);

      let bookedTravCount = await kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.myItems_report_id}/count?$status=InProgress&$current_step=Booked`);

      kf.app.setVariable("pending_travel_request", myPendTravReq.Count);
      kf.app.setVariable("approved_travel_request", bookedTravCount.Count);

      console.log("pending_travel_request = ",myPendTravReq.Count);
      console.log("approved_travel_request = ",bookedTravCount.Count);

      let rejectedTravCount = await kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.myItems_report_id}/count?$status=Rejected`);

      let completedTravCount = await kf.api(`/process-report/2/${account_id}/${ids.travel_process_id}/${dbIds.myItems_report_id}/count?$status=Completed`);

      kf.app.setVariable("total_travel_request", rejectedTravCount.Count + completedTravCount.Count + myPendTravReq.Count + bookedTravCount.Count);

      console.log("total_travel_request = ", rejectedTravCount.Count + completedTravCount.Count + myPendTravReq.Count + bookedTravCount.Count)

    }

    console.log("Refreshed dashboard card values");
  }

  const fetchData = async (pageNumber) => {
    console.log("---in fetchData---");

    let countUrl, dataUrl;
    
    if(pageNumber === 1){
      console.log("pageNumber = 1, url = ",url);
      let _url = url.split('?')[0];
      let urlFilter = url.split('?')[1];
      console.log("_url = ",_url," urlFilter = ",urlFilter);

      if(urlFilter !== ''){
        countUrl = `${_url}/count?${urlFilter}page_number=${pageNumber}&page_size=${itemsPerPage}`;
        dataUrl = `${_url}?${urlFilter}page_number=${pageNumber}&page_size=${itemsPerPage}`;
        console.log("No filter url = ", `${_url}/count?${urlFilter}page_number=${pageNumber}&page_size=${itemsPerPage}`);
      }
      else{
        countUrl = `${_url}/count?page_number=${pageNumber}&page_size=${itemsPerPage}`;
        dataUrl = `${_url}?page_number=${pageNumber}&page_size=${itemsPerPage}`;
        console.log("With filter url = ", `${_url}/count?page_number=${pageNumber}&page_size=${itemsPerPage}`);
      }
      
      kf.api(countUrl).then((paginationCountResponse) => {
        setPaginationTotal(paginationCountResponse.Count);
      });
    }
    else{
      dataUrl = `${url}page_number=${pageNumber}&page_size=${itemsPerPage}`;
    }

      console.log("complete data url = ", dataUrl);
      kf.api(dataUrl).then((apiResp) => {
        console.log("apiResp = ",apiResp);
  
        if(apiResp){

          const apiRespData = apiResp.Data;
          console.log("apiRespData = ",apiRespData);

          if(apiRespData.length > 0){

            const filteredMain = apiResp.Columns.filter((itemMain) => {
              return fieldsToDisplay.some((itemFlow) => itemMain.FieldId === itemFlow);
            });
  
            const generateColumns = (columns) => {
              return columns.map((each) => {
                if (each.FieldId === "Expense_ID" || each.FieldId === "Advance_Request_ID" || each.FieldId === "Travel_Request_ID") {
                  return {
                    title: each.FieldId === "Advance_Request_ID" ? "Advance Id" : each.Name,
                    dataIndex: each.Id,
                    key: each.Name,
                    render: (text, record) => (
                      <a
                      onClick={async () => {
                        console.log("record = ",record);
                        try{

                          let instance_id = record._id;
                          let apiCallUrl = '';

                          if(user_role === "Employee"){
                            apiCallUrl = `/process/2/${account_id}/${currentIds.process_id}/myitems?page_size=10000`;
                          }
                          else{
                            apiCallUrl = `/process/2/${account_id}/${currentIds.process_id}/pending?page_size=10000`;
                          }

                          console.log("apiCallUrl = ",apiCallUrl);
                          const response = await kf.api(apiCallUrl, { method: 'GET' });
  
                          console.log('Onclicked API response:', response);
  
                          const matchingData = response.Data.find(item => item._id === instance_id);
  
                          if (matchingData) {
                            const activity_instance_id = matchingData._activity_instance_id;
                      
                            console.log('instance_id:', instance_id);
                            console.log('activity_instance_id:', activity_instance_id);
                      
                            kf.app.page.openPopup(newFormPopupId, {
                              instance_id: instance_id,
                              activity_instance_id: activity_instance_id,
                            });
                          } else {
                            console.error('Matching data not found for instance_id:', instance_id);
                          }
                        }
                        catch (error) {
                          console.error('Error fetching activity_instance_id:', error);
                        }
                      }}
                      >
                      {text}
                      </a>
                    ),
                  };
                }
                else if (each.FieldId === "Common_date") {
                  return {
                    title: 'Date',
                    dataIndex: each.Id,
                    key: each.Name,
                    ...(each.FieldId==="Activity_Instance_ID" && { hidden: true }),
                  };
                }
                else if (each.FieldId === "Common_category") {
                  return {
                    title: 'Category',
                    dataIndex: each.Id,
                    key: each.Name,
                    ...(each.FieldId==="Activity_Instance_ID" && { hidden: true }),
                  };
                }
                else if (each.FieldId === "Actual_expense_amount") {
                  return {
                    title: 'Expense amount',
                    dataIndex: each.Id,
                    key: each.Name,
                    ...(each.FieldId==="Activity_Instance_ID" && { hidden: true }),
                  };
                }
                else if (each.FieldId === "Actual_reimbursement_amount") {
                  console.log("generateColumns: in Actual_reimbursement_amount id field")
                  return {
                    title: 'Reimbursable amount',
                    dataIndex: each.Id,
                    key: each.Name,
                    ...(each.FieldId==="Activity_Instance_ID" && { hidden: true }),
                  };
                }
                else if (each.FieldId === "Created_By" || each.FieldId === "created_by_user_id") {
                  return {
                    title: 'Requester',
                    dataIndex: each.Id,
                    key: each.Name,
                    render: (text) => (
                      <>
                        <Image preview={false} width={16} height={16} src={userimg_img} />&nbsp;&nbsp;
                        <Tooltip placement="topLeft" title={text}>{text}</Tooltip>
                      </>
                    ),
                    ...(each.FieldId==="Activity_Instance_ID" && { hidden: true }),
                  };
                }
                else if (each.FieldId === "Advance_Payment_Request_Reason") {
                  return {
                    title: 'Advance purpose',
                    dataIndex: each.Id,
                    key: each.Name,
                    render: (text) => (
                      <>
                        <Tooltip placement="topLeft" title={<span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>}>
                          {text}
                        </Tooltip>
                      </>
                    ),
                    ...(each.FieldId==="Activity_Instance_ID" && { hidden: true }),
                  };
                }
                else {
                  return {
                    title: each.Name,
                    dataIndex: each.Id,
                    key: each.Name,
                    ...(each.FieldId==="Activity_Instance_ID" && { hidden: true }),
                  };
                }
              });
            };
          
            const _columns = generateColumns(filteredMain);
            const columns =_columns.filter(item => !item.hidden);
  
            if(user_role === "Employee"){
              console.log("Not showing Approve-Reject buttons..");
              console.log("setting columns = ",columns);
              setTableColumns(columns);
            }
            else if(user_role === "Travel admin"){
              console.log("Showing Acknowledge buttons..");
                const col=[...columns, {
                  title: 'Actions',
                  key: 'action',
                  render: (text,record) => (
                    <Space size="middle">
                      <Tooltip placement="topLeft" title={"Acknowledge"}>
                        <Button type="link"  shape="circle"  onClick={() => handleComplete(record, ids.travel_process_id)}>
                          <Image preview={false}  width={24} height={24}  src={open}/>
                        </Button>
                      </Tooltip>
                    </Space>
                  ),
                }]
        
                setTableColumns(col);
            }
            else{
              console.log("Showing Approve-Reject buttons..");
              const col=[...columns, {
                title: 'Actions',
                key: 'action',
                render: (text,record) => (
                  <Space size="middle">
                    <Button 
                      type="primary" 
                      icon={<CheckOutlined />} 
                      className = "clsApproveBtn"
                      onClick={() => handleApprove(record, currentIds.process_id)}
                    />
                    <Button 
                      type="primary" 
                      icon={<CloseOutlined />} 
                      className="clsRejectBtn"
                      onClick={() => handleReject(record, currentIds.process_id)}
                    />
                  </Space>
                ),
              }]
      
              setTableColumns(col);
            }
            console.log("setting apiRespData = ",apiRespData);
            setTableData(apiRespData);
            setLoading(false);

            const handleComplete = async (record, process_id) => {
              const instance_id = record._id;
              try{
                let apiCallUrl = `/process/2/${account_id}/${process_id}/pending?page_size=10000`;
              
                const response = await kf.api(apiCallUrl, { method: 'GET' });
              
                console.log('Pending API Response:', response);
              
                if (response === 'Matching data not found for _id') {
                  kf.client.showInfo('Your request is already processed');
                  return;
                }
              
                const matchingData = response.Data.find((item) => item._id === instance_id);
                if (matchingData) {
                  let activity_instance_id = matchingData._activity_instance_id;
              
                  console.log("record = ",record);
                  console.log("instance_id = ",instance_id);
                  console.log("activity_instance_id = ",activity_instance_id);

                  if(activeTab === "cancelTravel"){
                    console.log("in cancelTravel, opening popup with request_type");
                    kf.app.page.openPopup(newFormPopupId, { 
                      instance_id: instance_id, 
                      activity_instance_id : activity_instance_id,
                      request_type : "cancellation"
                    });
                  }
                  else{
                    console.log("in Travel, opening popup without request_type");
                    kf.app.page.openPopup(newFormPopupId, { 
                      instance_id: instance_id, 
                      activity_instance_id : activity_instance_id
                    });
                  }
                }
              }
              catch (error) {
                console.error('Error performing action:', error);
              }
            };
    
            const handleApprove = async (record, process_id) => {

              console.log("record = ",record);
              const instance_id = record._id;

              try{
                let apiCallUrl = `/process/2/${account_id}/${process_id}/pending?page_size=10000`;

                const response = await kf.api(apiCallUrl, { method: 'GET' });

                console.log('Pending API Response:', response);

                if (response === 'Matching data not found for _id') {
                  kf.client.showInfo('Your request is already processed');
                  return;
                }

                const matchingData = response.Data.find((item) => item._id === instance_id);
                if (matchingData) {
                  let activity_instance_id = matchingData._activity_instance_id;
                  let requester = matchingData._created_by["Name"];

                  console.log("record = ",record);
                  console.log("instance_id = ",instance_id);
                  console.log("activity_instance_id = ",activity_instance_id);

                  let getItemUrl = `/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}`;
                  const itemResp = await kf.api(getItemUrl, { method: 'GET' });

                  console.log('myTask Item API Response:', itemResp);

                  let showConfirmContent;

                  if(activeTab === "expense"){
                    if(itemResp.Duplicate_expenses_count){
                      showConfirmContent = requester + ' has claimed for an amount of '+ itemResp.Actual_expense_amount +'. '+ itemResp.Duplicate_expenses_count +' possible duplicate(s) found for this request. Are you sure you want to approve?'
                    }
                    else{
                      showConfirmContent = requester + ' has claimed for an amount of '+ itemResp.Actual_expense_amount +'. Are you sure you want to approve?'
                    }
                  }
                  else if(activeTab === "advance"){
                    showConfirmContent = requester + ' has requested for an advance of '+ itemResp.Advance_Amount +'. Are you sure you want to approve?'
                  }
                  else{
                    showConfirmContent = requester + ' has planned for the travel. Are you sure you want to approve?'
                  }

                  kf.client.showConfirm({
                    title: 'Confirm Approval',
                    content: showConfirmContent
                  })
                  .then((res)=>{
                    if(res === "OK"){
                      console.log(`/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}/submit?_application_id=${application_id}`);

                      kf.api(`/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}/submit?_application_id=${application_id}`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                      })
                      .then((submitResp) => {
                        if(submitResp){
                          console.log("submitResp = ",submitResp);

                          refreshDashboardData(process_id);

                          let randNum = Math.random();
                          console.log("setted rand in approval table, on Approve ---", randNum);
                          kf.app.setVariable('dashboardRandNum',randNum);
                          setCurrentPage(1);
                        }
                      });
                    }
                    else{
                    }
                  }
                  ).catch((err)=>{
                    console.log(err,'Error in callback: handleApprove')
                  });

                }
              }
              catch (error) {
                console.error('Error performing action:', error);
              }
            };
            
            const handleReject = async (record, process_id) => {
              console.log("record = ",record);
              const instance_id = record._id;

              try{
                let apiCallUrl = `/process/2/${account_id}/${process_id}/pending?page_size=10000`;
              
                const response = await kf.api(apiCallUrl, { method: 'GET' });
              
                console.log('Pending API Response:', response);
              
                if (response === 'Matching data not found for _id') {
                  kf.client.showInfo('Your request is already processed');
                  return;
                }
              
                const matchingData = response.Data.find((item) => item._id === instance_id);
                if (matchingData) {
                  let activity_instance_id = matchingData._activity_instance_id;
                  let requester = matchingData._created_by["Name"];
              
                  console.log("record = ",record);
                  console.log("instance_id = ",instance_id);
                  console.log("activity_instance_id = ",activity_instance_id);
              
                  let getItemUrl = `/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}`;
                  const itemResp = await kf.api(getItemUrl, { method: 'GET' });
              
                  console.log('myTask Item API Response:', itemResp);
              
                  let showRejectContent;
              
                  if(activeTab === "expense"){
                    if(itemResp.Duplicate_expenses_count){
                      showRejectContent = requester + ' has claimed for an amount of '+ itemResp.Actual_expense_amount +'. '+ itemResp.Duplicate_expenses_count +' possible duplicate(s) found for this request. Are you sure you want to reject?'
                    }
                    else{
                      showRejectContent = requester + ' has claimed for an amount of '+ itemResp.Actual_expense_amount +'. Are you sure you want to reject?'
                    }
                  }
                  else if(activeTab === "advance"){
                    showRejectContent = requester + ' has requested for an advance of '+ itemResp.Advance_Amount +'. Are you sure you want to reject?'
                  }
                  else{
                    showRejectContent = requester + ' has planned for the travel. Are you sure you want to reject?'
                  }
              
                  kf.client.showConfirm({
                    title: 'Confirm Reject',
                    content: showRejectContent,
                  })
                  .then((res)=>{
                    if(res === "OK"){
                      console.log(`/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}/reject`);
                      kf.api(`/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}/reject`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                      })
                      .then((rejectResp) => {
                        if(rejectResp){
                          console.log("rejectResp = ",rejectResp);

                          refreshDashboardData(process_id);

                          let randNum = Math.random();
                          console.log("setted rand in approval table, on Reject ---", randNum);
                          kf.app.setVariable('dashboardRandNum',randNum);
                          setCurrentPage(1);
                        }
                      });
                    }
                    else{
                    }
                  })
                  .catch((err)=>{
                    console.log(err,'Error in callback: handleReject')
                  });
                }
              }
              catch (error) {
                console.error('Error performing action:', error);
              }
            };
          }
          else{
            setTableData([]);
            setTableColumns([]);
            setLoading(false);
            setemptyicon('block');
          }
        }
      });
    
  };

  const fetchUrl = (_ids) => {
    console.log("---in fetchUrl---, _ids = ", _ids);
    let process_id, report_id;

      if(activeTab === 'expense'){
        process_id = _ids.expense_process_id;
        report_id = _ids.expense_report_id;
        
        setNewFormPopupId(popupIds.expense);
        console.log("New form popupId = ",popupIds.expense);

        setCurrentIds({
          "process_id" :process_id,
          "report_id" : report_id
        })

        if(user_role === "Employee"){
          setFieldsToDisplay([
            'Expense_ID', 
            'Common_date',
            'Common_category', 
            'Actual_expense_amount',
            'Actual_reimbursement_amount',
            '_current_step',
            'Activity_Instance_ID'
          ]);
        }
        else{
          setFieldsToDisplay([
            'Expense_ID', 
            'Common_date',
            'Common_category', 
            'Actual_expense_amount',
            'Actual_reimbursement_amount',
            'created_by_user_id',
            'Activity_Instance_ID'
          ]);
        }
        
        setNoData({
          "noDataText" : "No expense request yet",
          "noDataSubText" : "It seems like no expense data have been added yet"
        })

      }
      else if(activeTab === 'advance'){
        process_id = _ids.advance_process_id;
        report_id = _ids.advance_report_id;

        setNewFormPopupId(popupIds.advance);
        console.log("New form popupId = ",popupIds.advance);

        setCurrentIds({
          "process_id" : process_id,
          "report_id" : report_id
        })

        if(user_role === "Employee"){
          setFieldsToDisplay([
            'Advance_Request_ID', 
            'Date_1',
            'Advance_Payment_Category',
            'Advance_Amount',
            'Advance_Payment_Request_Reason',
            '_current_step',
            'Activity_Instance_ID'
          ]);
        }
        else{
          setFieldsToDisplay([
            'Advance_Request_ID', 
            'Date_1',
            'Advance_Payment_Category',
            'Advance_Amount',
            'Advance_Payment_Request_Reason',
            'created_by_user_id',
            'Activity_Instance_ID'
          ]);
        }

        setNoData({
          "noDataText" : "No advance request yet",
          "noDataSubText" : "It seems like no advance data have been added yet"
        })
      }
      else if(activeTab === 'travel' || activeTab === "cancelTravel"){
        process_id = _ids.travel_process_id;
        report_id = _ids.travel_report_id;

        setNewFormPopupId(popupIds.travel);
        console.log("New form popupId = ",popupIds.travel);

        setCurrentIds({
          "process_id" : process_id,
          "report_id" : report_id
        })

        if(user_role === "Employee"){
          setFieldsToDisplay([
            'Travel_Request_ID', 
            'Common_from_date',
            'Common_to_date',
            'common_From',
            'common_To',
            '_current_step',
            'Activity_Instance_ID'
          ]);
        }
        else{
          setFieldsToDisplay([
            'Travel_Request_ID', 
            'Common_from_date',
            'Common_to_date',
            'common_From',
            'common_To',
            'Created_By',
            'Activity_Instance_ID'
          ]);
        }

        setNoData({
          "noDataText" : "No travel request yet",
          "noDataSubText" : "It seems like no travel data have been added yet"
        })

      }

      if(user_role === "Travel admin"){
        console.log(user_role, " url : ");
        if(activeTab === 'travel'){
          console.log(`/process-report/2/${process_id}/${report_id}?$cancel_request=No&`);
          setUrl(`/process-report/2/${account_id}/${process_id}/${report_id}?$cancel_request=No&`);
        }
        else{
          console.log(`/process-report/2/${process_id}/${report_id}?$cancel_request=Yes&`);
          setUrl(`/process-report/2/${account_id}/${process_id}/${report_id}?$cancel_request=Yes&`);
        }
      }
      else if(user_role === "Employee"){
        console.log(user_role, " url : ");
        console.log(`/process-report/2/${process_id}/${report_id}?$status=InProgress&`);
        setUrl(`/process-report/2/${account_id}/${process_id}/${report_id}?$status=InProgress&`);
      }
      else{
        console.log(user_role, " url : ");
        console.log(`/process-report/2/${process_id}/${report_id}?`);
        setUrl(`/process-report/2/${account_id}/${process_id}/${report_id}?`);
      }

      console.log("Setting watch param");
      setWatchParamFlag(randNum.current);
  };

  useEffect(() => {
    if(url !== '' && watchParamFlag !== 0){
      console.log("in url, watchParamFlag useEffect");
      fetchData(1);
    }
  }, [url, watchParamFlag]);

  const fetchCounts = async () => {
    console.log("--in fetchCounts--");
    const _ids = await fetchIds();

    fetchUrl(_ids);

    if(user_role === "Manager" || user_role === "Admin"){
      kf.api(`/process-report/2/${account_id}/${_ids.expense_process_id}/${_ids.expense_report_id}/count`).then((expenseCountResponse) => {
        setTotalExpenses(expenseCountResponse.Count);
        console.log("expenseCountResponse.Count = ",expenseCountResponse.Count);
      });
  
      kf.api(`/process-report/2/${account_id}/${_ids.advance_process_id}/${_ids.advance_report_id}/count`).then((advanceCountResponse) => {
        setTotalAdvances(advanceCountResponse.Count);
        console.log("advanceCountResponse.Count = ",advanceCountResponse.Count);
      });
  
      kf.api(`/process-report/2/${account_id}/${_ids.travel_process_id}/${_ids.travel_report_id}/count`).then((travelCountResponse) => {
        setTotalTravels(travelCountResponse.Count);
        console.log("travelCountResponse.Count = ",travelCountResponse.Count);
      });
    }
    else if(user_role === "Finance manager"){
      kf.api(`/process-report/2/${account_id}/${_ids.expense_process_id}/${_ids.expense_report_id}/count`).then((expenseCountResponse) => {
        setTotalExpenses(expenseCountResponse.Count);
        console.log("expenseCountResponse.Count = ",expenseCountResponse.Count);
      });
  
      kf.api(`/process-report/2/${account_id}/${_ids.advance_process_id}/${_ids.advance_report_id}/count`).then((advanceCountResponse) => {
        setTotalAdvances(advanceCountResponse.Count);
        console.log("advanceCountResponse.Count = ",advanceCountResponse.Count);
      });
    }
    else if(user_role === "Travel admin"){
      kf.api(`/process-report/2/${account_id}/${_ids.travel_process_id}/${_ids.travel_report_id}/count?$cancel_request=No`).then((travelCountResponse) => {
        setTotalTravels(travelCountResponse.Count);
        console.log("travelCountResponse.Count = ",travelCountResponse.Count);
      });

      kf.api(`/process-report/2/${account_id}/${_ids.travel_process_id}/${_ids.travel_report_id}/count?$cancel_request=Yes`).then((cancelCountResponse) => {
        setTotalCancelTravels(cancelCountResponse.Count);
        console.log("cancelCountResponse.Count = ",cancelCountResponse.Count);
      });
    }
    else{
      kf.api(`/process-report/2/${account_id}/${_ids.expense_process_id}/${_ids.expense_report_id}/count?$status=InProgress`).then((expenseCountResponse) => {
        setTotalExpenses(expenseCountResponse.Count);
        console.log("expenseCountResponse.Count = ",expenseCountResponse.Count);
      });
  
      kf.api(`/process-report/2/${account_id}/${_ids.advance_process_id}/${_ids.advance_report_id}/count?$status=InProgress`).then((advanceCountResponse) => {
        setTotalAdvances(advanceCountResponse.Count);
        console.log("advanceCountResponse.Count = ",advanceCountResponse.Count);
      });
  
      kf.api(`/process-report/2/${account_id}/${_ids.travel_process_id}/${_ids.travel_report_id}/count?$status=InProgress`).then((travelCountResponse) => {
        setTotalTravels(travelCountResponse.Count);
        console.log("travelCountResponse.Count = ",travelCountResponse.Count);
      });
    }
  };

  const handleTabClick = (tab) => {
    setLoading(true);
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    console.log('Pagination changed to page:', newPage);
    setCurrentPage(newPage);
    fetchData(newPage);
  };

  const renderEmptyState = () => {
    return (
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <EmptyState height="170" width="400" />
        <p style={{ fontSize: '14px', margin: '0px !important', color: "#2E3032" }}>{noData.noDataText}</p>
        <p style={{ fontSize: '12px', color: "#545C6B" }}>{noData.noDataSubText}</p>
      </div>
    );
  };

  let tabContent = null; 

  if (user_role === "Employee" || user_role === "Manager" || user_role === "Admin") {
    tabContent = (
      <>
        <Space wrap style={{ paddingBottom: '16px' }}>
          <Button
            type={activeTab === 'expense' ? 'primary' : 'default'}
            shape="round"
            size="small"
            onClick={() => handleTabClick('expense')}
          >
            Expense ({totalExpenses})
          </Button>
          <Button
            type={activeTab === 'advance' ? 'primary' : 'default'}
            shape="round"
            size="small"
            onClick={() => handleTabClick('advance')}
          >
            Advance ({totalAdvances})
          </Button>
          <Button
            type={activeTab === 'travel' ? 'primary' : 'default'}
            shape="round"
            size="small"
            onClick={() => handleTabClick('travel')}
          >
            Travel ({totalTravels})
          </Button>
        </Space>
      </>
    );
  } 
  else if(user_role === "Finance manager"){
    tabContent = (
      <>
        <Space wrap style={{ paddingBottom: '16px' }}>
          <Button
            type={activeTab === 'expense' ? 'primary' : 'default'}
            shape="round"
            size="small"
            onClick={() => handleTabClick('expense')}
          >
            Expense ({totalExpenses})
          </Button>
          <Button
            type={activeTab === 'advance' ? 'primary' : 'default'}
            shape="round"
            size="small"
            onClick={() => handleTabClick('advance')}
          >
            Advance ({totalAdvances})
          </Button>
        </Space>
      </>
    );
  }
  else if(user_role === "Travel admin"){
    tabContent = (
      <>
        <Space wrap style={{ paddingBottom: '16px' }}>
          <Button
            type={activeTab === 'travel' ? 'primary' : 'default'}
            shape="round"
            size="small"
            onClick={() => handleTabClick('travel')}
          >
            Pending for booking ({totalTravels})
          </Button>
          <Button
            type={activeTab === 'cancelTravel' ? 'primary' : 'default'}
            shape="round"
            size="small"
            onClick={() => handleTabClick('cancelTravel')}
          >
            Pending for cancellation ({totalCancelTravels})
          </Button>
        </Space>
      </>
    );
  }

  return (
    <Space
      direction="vertical"
      size="middle"
      style={{
        display: 'flex',
        overflow: 'hidden',
        backgroundColor: 'white',
        padding: '0px 28px 0px 28px',
      }}
    >
      <Title className='clsTitle' level={4}>
        {user_role === "Employee" ? "Pending for approval" : "Pending for my approval"}
      </Title>

      <div>{tabContent}</div>
      
      {loading ? (
        <Skeleton active />
      ) : (
        <>
          <Table
            className='clsTable'
            columns={tableColumns}
            dataSource={tableData}
            locale={{
              emptyText: renderEmptyState(),
            }}
            components={{
              header: {
                wrapper: (props) => <thead style={{ display: tableData.length === 0 ? 'none' : 'table-header-group' }} {...props} />,
              },
              body: {
                cell: (cellProps) => {          
                  return (
                    <td
                      {...cellProps}
                      style={{
                        borderBottom: tableData.length === 0 ? 'none' : '2px solid #F0F3F7',
                      }}
                    >
                      {cellProps.children}
                    </td>
                  );
                },
              },
            }}
            pagination={false}
          />
          <div className='paginationCls'>
            {paginationTotal > itemsPerPage && (
              <Pagination
                style={{ marginTop: '10px', marginLeft: '15px' }}
                current={currentPage}
                defaultPageSize={itemsPerPage}
                total={paginationTotal}
                onChange={handlePageChange}
              />
            )}
          </div>
        </>
      )}
    </Space>
  );
};

export default ManagerApproval;