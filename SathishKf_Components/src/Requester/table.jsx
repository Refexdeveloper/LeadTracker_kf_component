// This file contains the code for both Expenses & Advances page
// The data is being fetched based on the conditions - current page id, mode, current tab & current page

import React,{useState, useEffect, useRef} from 'react';
import './index.css';
import { Table, Space, Button, Typography, Skeleton, Pagination, Radio, Image, Tooltip } from 'antd';
import { CheckOutlined,CloseOutlined } from '@ant-design/icons';
import FilterComponent from './FilterComponent';
import { ReactComponent as EmptyState} from './Images/noData.svg';
import receipt from './Images/receipt.png';
import userimg_img from "./Images/userimg.png";

const { Title } = Typography;
const itemsPerPage = 7;
const searchDelay = 500;

export function  MyTable ()  {

  const kf = window.kf;
  const application_id = kf.app._id;
  const account_id = kf.account._id;
  const currentPageId = kf.app.page._id;
  const user_role = kf.user.Role.Name;
  const user_id = kf.user._id

  const newFormPopupId = currentPageId.includes("Expenses") ? "Popup_DMVnCeIvO" : "Popup_OCsfQDRd2";
  const policyDocPopupId = currentPageId.includes("Expenses") ? "Popup_8sEupi-zk" : "Popup_f7hZfsCdm";
  // const receiptIdField = currentPageId.includes("Expenses") ? "Column_CwD4QZ7Ea5" : "Column_kC15UtBd1d";

  const [emptyicon, setemptyicon] = useState('none');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTab, setCurrentTab] = useState("pendingTasks");
  const [ids, setIds] = useState(null);

  const [url, setUrl] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  const [pendingType, setPendingType] = useState('primary');
  const [approvedType, setApprovedType] = useState('default');
  const [rejectedType, setRejectedType] = useState('default');
  const [withdrawType, setwithdrawType] = useState('default');
  const [todoType, setTodoType] = useState('default');

  const [pendingTotal, setPendingTotal] = useState(0);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [rejectedTotal, setRejectedTotal] = useState(0);
  const [withdrawnTotal, setWithdrawnTotal] = useState(0);
  const [todoTotal, setTodoTotal] = useState(0);

  const [fieldsToDisplay, setFieldsToDisplay] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [paginationTotal, setPaginationTotal] = useState(0);

  const [watchParamsUrlFlag, setWatchParamsUrlFlag] = useState(0);
  const [watchParamsModeFlag, setWatchParamsModeFlag] = useState(0);
  const randNum = useRef('');

  // useEffect to exectute on page load
  // Also executes whenever watchParam variable value updated
  useEffect(() => {

    kf.context.watchParams(function (data) {

      randNum.current = data.expAdvRandNum;

      if(user_role === "Employee" || user_role === 'Travel admin'){
        setMode('myItems');
      }
      else{
        setMode('myTasks');
      }   
      // setting the randNum to state variable to trigger mode useEffect 
      // to refresh the tab each time when a request is approved/rejected or whenever a new request is submitted
      setWatchParamsModeFlag(data.expAdvRandNum);
    }); 
  }, [])

  
  // mode useEffect
  // triggers each time whenever the mode / watchParamsModeFlag modified
  useEffect(() => {
    if(mode !== ''){

      if(mode === "myTasks"){
        setCurrentTab("pendingTasks");
        fetchCounts("pendingTasks");
      }
      else{
        setCurrentTab("pendingItems");
        fetchCounts("pendingItems");
      }

      setCurrentPage(1);

      setPendingType("primary");
      setApprovedType("default");
      setRejectedType("default");
    }
  }, [mode, watchParamsModeFlag])


  // Function to fetch items count in each tab in the current mode
  const fetchCounts = async (tab) => {

    // Calling checkIds to get all required ids to hit apis
    const ids = await checkIds();

    const _tab = tab ? tab : currentTab;

    // Calling fetchUrl here to parallelly fetch the current tab's data 
    fetchUrl(ids, _tab);

    const process_id = ids.process_id;
    const pendingTasks_report_id = ids.pendingTasks_report_id;
    const approvedTasks_report_id = ids.approvedTasks_report_id;
    const rejectedTasks_report_id = ids.rejectedTasks_report_id;
    const myItems_report_id = ids.myItems_report_id;
    const todoItems_report_id = ids.todoItems_report_id;

    if(mode === "myTasks"){
      kf.api(`/process-report/2/${account_id}/${process_id}/${pendingTasks_report_id}/count`).then((pendingCountResponse) => {
        setPendingTotal(pendingCountResponse.Count);
      });
       
      kf.api(`/process-report/2/${account_id}/${process_id}/${rejectedTasks_report_id}/count`).then((rejectedCountResponse) => {
        setRejectedTotal(rejectedCountResponse.Count);
      });

      kf.api(`/process-report/2/${account_id}/${process_id}/${approvedTasks_report_id}/count`).then((approvedCountResponse) => {
        setApprovedTotal(approvedCountResponse.Count);
      });     
    }
    else{
      kf.api(`/process-report/2/${account_id}/${process_id}/${myItems_report_id}/count?$status=InProgress`).then((pendingCountResponse) => {
        setPendingTotal(pendingCountResponse.Count);
      });

      kf.api(`/process-report/2/${account_id}/${process_id}/${todoItems_report_id}/count?$status=Rejected`).then((todoCountResponse) => {
        setTodoTotal(todoCountResponse.Count);
      });

      kf.api(`/process-report/2/${account_id}/${process_id}/${myItems_report_id}/count?$status=Withdrawn`).then((withdrawnCountResponse) => {
        setWithdrawnTotal(withdrawnCountResponse.Count);
      });

      kf.api(`/process-report/2/${account_id}/${process_id}/${myItems_report_id}/count?$status=Completed`).then((approvedCountResponse) => {
        setApprovedTotal(approvedCountResponse.Count);
      });

      kf.api(`/process-report/2/${account_id}/${process_id}/${myItems_report_id}/count?$status=Rejected`).then((rejectedCountResponse) => {
        setRejectedTotal(rejectedCountResponse.Count);
      });
    }
  }


  // Function to check whether all the required ids are available
  const checkIds = async () => {
    const kf = window.kf;

    let names = {}, ids = {};

    if(currentPageId.includes("Expenses")){

      if(user_role === "Manager" || user_role === "Admin"){
        ids = {
          process_id: await kf.app.getVariable("expense_process_id"),
          pendingTasks_report_id: await kf.app.getVariable("expensePendingTasks_report_id"),
          approvedTasks_report_id: await kf.app.getVariable("expenseApprovedTasks_report_id"),
          rejectedTasks_report_id: await kf.app.getVariable("expenseRejectedTasks_report_id"),
          myItems_report_id: await kf.app.getVariable("expenseMyItems_report_id"),
          todoItems_report_id: await kf.app.getVariable('expenseTodoItems_report_id')
        };

        names = {
          process_name : 'Expense Management',
          pendingTasks_report_name : 'Manager: Pending tasks',
          approvedTasks_report_name : 'My Tasks - Approved',
          rejectedTasks_report_name : 'My tasks - Rejected',
          myItems_report_name : "My Items report",
          todoItems_report_name : "Sentback items report"
        }
      }
      else if(user_role === "Finance manager"){
        ids = {
          process_id: await kf.app.getVariable("expense_process_id"),
          pendingTasks_report_id: await kf.app.getVariable("expensePendingTasks_report_id"),
          approvedTasks_report_id: await kf.app.getVariable("expenseApprovedTasks_report_id"),
          rejectedTasks_report_id: await kf.app.getVariable("expenseRejectedTasks_report_id"),
          myItems_report_id: await kf.app.getVariable("expenseMyItems_report_id"),
          todoItems_report_id: await kf.app.getVariable('expenseTodoItems_report_id')
        };

        names = {
          process_name : 'Expense Management',
          pendingTasks_report_name : 'FM: Pending tasks',
          approvedTasks_report_name : 'FM: Approved tasks',
          rejectedTasks_report_name : 'FM: Rejected tasks',
          myItems_report_name : "My Items report",
          todoItems_report_name : "Sentback items report"
        }
      }
      else if(user_role === "Employee" || user_role === "Travel admin"){
        ids = {
          process_id: await kf.app.getVariable("expense_process_id"),
          myItems_report_id: await kf.app.getVariable("expenseMyItems_report_id"),
          todoItems_report_id: await kf.app.getVariable("expenseTodoItems_report_id")
        };

        names = {
          process_name : 'Expense Management',
          myItems_report_name : "My Items report",
          todoItems_report_name : 'Sentback items report'
        }
      }
    }
    else if(currentPageId.includes("Advances")){

      if(user_role === "Manager" || user_role === "Admin"){
        ids = {
          process_id: await kf.app.getVariable("advance_process_id"),
          pendingTasks_report_id: await kf.app.getVariable("advancePendingTasks_report_id"),
          approvedTasks_report_id: await kf.app.getVariable("advanceApprovedTasks_report_id"),
          rejectedTasks_report_id: await kf.app.getVariable("advanceRejectedTasks_report_id"),
          myItems_report_id: await kf.app.getVariable("advanceMyItems_report_id"),
          todoItems_report_id: await kf.app.getVariable("advanceTodoItems_report_id")
        };

        names = {
          process_name : 'Advance Payment Request Process',
          pendingTasks_report_name : 'Manager: Pending tasks',
          approvedTasks_report_name : 'My Tasks - Approved',
          rejectedTasks_report_name : 'My tasks - Rejected',
          myItems_report_name : "My Items report",
          todoItems_report_name : 'Sentback items report'
        }
      }
      else if(user_role === "Finance manager"){
        ids = {
          process_id: await kf.app.getVariable("advance_process_id"),
          pendingTasks_report_id: await kf.app.getVariable("advancePendingTasks_report_id"),
          approvedTasks_report_id: await kf.app.getVariable("advanceApprovedTasks_report_id"),
          rejectedTasks_report_id: await kf.app.getVariable("advanceRejectedTasks_report_id"),
          myItems_report_id: await kf.app.getVariable("advanceMyItems_report_id"),
          todoItems_report_id: await kf.app.getVariable("advanceTodoItems_report_id")
        };

        names = {
          process_name : 'Advance Payment Request Process',
          pendingTasks_report_name : 'FM: Pending tasks',
          approvedTasks_report_name : 'FM: Approved tasks',
          rejectedTasks_report_name : 'FM: Rejected tasks',
          myItems_report_name : "My Items report",
          todoItems_report_name : 'Sentback items report'
        }
      }
      else if(user_role === "Employee" || user_role === "Travel admin"){
        ids = {
          process_id: await kf.app.getVariable("advance_process_id"),
          myItems_report_id: await kf.app.getVariable("advanceMyItems_report_id"),
          todoItems_report_id: await kf.app.getVariable("advanceTodoItems_report_id")
        };

        names = {
          process_name : 'Advance Payment Request Process',
          myItems_report_name : "My Items report",
          todoItems_report_name : 'Sentback items report'
        }
      }
    }

    // code to check whether all the required ids are available
    const allIdsFetched = Object.values(ids).every(id => id !== undefined && id !== '');
    if (allIdsFetched) {

      setIds(ids);
      setCurrentPage(1);

      return ids;
    }

    // If not all ids found, calling getFetchIds to fetch missing ids
    const fetchIds = await getFetchIds (ids, names);
    return fetchIds;
  };


  // Function to get ids to be used in api calls
  const getFetchIds = async (ids, names) => {

    const application_id = kf.app._id;
    const account_id = kf.account._id;
    const process_list = await kf.api(`/flow/2/${account_id}/process?_application_id=${application_id}`);

    if (!ids.process_id || ids.process_id === '') {

      const process_name = names["process_name"];
      const process_info = process_list.find(itm => itm.Name === process_name);
      ids["process_id"] = process_info?._id;

      if(currentPageId.includes("Expenses")){
        kf.app.setVariable("expense_process_id", ids.process_id);
      }
      else if(currentPageId.includes("Advances")){
        kf.app.setVariable("advance_process_id", ids.process_id);
      }
    }

    if(!ids.pendingTasks_report_id || ids.pendingTasks_report_id === '' || !ids.approvedTasks_report_id || ids.approvedTasks_report_id === '' || !ids.rejectedTasks_report_id || ids.rejectedTasks_report_id === '' || !ids.myItems_report_id || ids.myItems_report_id === '' || !ids.todoItems_report_id || ids.todoItems_report_id === ''){
      try{
        const pendingTasks_report_response = await kf.api(`/flow/2/${account_id}/process/${ids.process_id}/report?_application_id=${application_id}`);

        if(!ids.pendingTasks_report_id || ids.pendingTasks_report_id === ''){
          const pendingTasks_report_name = names["pendingTasks_report_name"];
          const pendingTasks_report_info = pendingTasks_report_response.find(item => item.Name === pendingTasks_report_name);

          if (pendingTasks_report_info) {
            ids["pendingTasks_report_id"] = pendingTasks_report_info._id;
  
            if(currentPageId.includes("Expenses")){
              kf.app.setVariable("expensePendingTasks_report_id", ids.pendingTasks_report_id);
            }
            else if(currentPageId.includes("Advances")){
              kf.app.setVariable("advancePendingTasks_report_id", ids.pendingTasks_report_id);
            }
          } else {
            console.error('Pending tasks report not found.');
          }
        }

        if(!ids.approvedTasks_report_id || ids.approvedTasks_report_id === ''){
          const approvedTasks_report_name = names["approvedTasks_report_name"];
          const approvedTasks_report_info = pendingTasks_report_response.find(item => item.Name === approvedTasks_report_name);
         
          if (approvedTasks_report_info) {
            ids["approvedTasks_report_id"] = approvedTasks_report_info._id;
         
            if(currentPageId.includes("Expenses")){
              kf.app.setVariable("expenseApprovedTasks_report_id", ids.approvedTasks_report_id);
            }
            else if(currentPageId.includes("Advances")){
              kf.app.setVariable("advanceApprovedTasks_report_id", ids.approvedTasks_report_id);
            }
         
          } else {
            console.error('Approved Tasks report not found.');
          }
        }

        if(!ids.rejectedTasks_report_id || ids.rejectedTasks_report_id === ''){
          const rejectedTasks_report_name = names["rejectedTasks_report_name"];
          const rejectedTasks_report_info = pendingTasks_report_response.find(item => item.Name === rejectedTasks_report_name);
         
          if (rejectedTasks_report_info) {
            ids["rejectedTasks_report_id"] = rejectedTasks_report_info._id;
       
            if(currentPageId.includes("Expenses")){
              kf.app.setVariable("expenseRejectedTasks_report_id", ids.rejectedTasks_report_id);
            }
            else if(currentPageId.includes("Advances")){
              kf.app.setVariable("advanceRejectedTasks_report_id", ids.rejectedTasks_report_id);
            }
         
          } else {
            console.error('Rejected Tasks report not found.');
          }
        }

        if(!ids.myItems_report_id || ids.myItems_report_id === ''){
          const myItems_report_name = names["myItems_report_name"];
          const myItems_report_info = pendingTasks_report_response.find(item => item.Name === myItems_report_name);
         
          if (myItems_report_info) {
            ids["myItems_report_id"] = myItems_report_info._id;
         
            if(currentPageId.includes("Expenses")){
              kf.app.setVariable("expenseMyItems_report_id", ids.myItems_report_id);
            }
            else if(currentPageId.includes("Advances")){
              kf.app.setVariable("advanceMyItems_report_id", ids.myItems_report_id);
            }
         
          } else {
            console.error('My Items report not found.');
          }
        }

        if(!ids.todoItems_report_id || ids.todoItems_report_id === ''){
          const todoItems_report_name = names["todoItems_report_name"];
          const todoItems_report_info = pendingTasks_report_response.find(item => item.Name === todoItems_report_name);
         
          if (todoItems_report_info) {
            ids["todoItems_report_id"] = todoItems_report_info._id;
         
            if(currentPageId.includes("Expenses")){
              kf.app.setVariable("expensetodoItems_report_id", ids.todoItems_report_id);
            }
            else if(currentPageId.includes("Advances")){
              kf.app.setVariable("advancetodoItems_report_id", ids.todoItems_report_id);
            }
         
          } else {
            console.error('My Items report not found.');
          }
        }
      }
      catch (error) {
        console.error('Error fetching report ids:', error);
      }
    }

    // code to check whether all ids are fetched
    const allIdsFetchedFinal = Object.values(ids).every(id => id !== undefined && id !== '');
    if (allIdsFetchedFinal) {
      setIds(ids);
      setCurrentPage(1);
      return ids;
    }
    else {
      throw new Error('One or more IDs not found in API responses.');
    }
  }


  // Function to construct api Url to fetch data for the current tab
  const fetchUrl = async (ids, tab) => {

    const process_id = ids.process_id;
    const pending_report_id = ids.pendingTasks_report_id;
    const approved_report_id = ids.approvedTasks_report_id;
    const rejected_report_id = ids.rejectedTasks_report_id;
    const myItems_report_id = ids.myItems_report_id;
    const todoItems_report_id = ids.todoItems_report_id;

    // Deciding the fields to display in each tab
    if(currentPageId.includes("Expenses")){
      if(tab === "pendingTasks"){
        setFieldsToDisplay([
          'Expense_ID', 
          'Common_date',
          'Common_category', 
          'Actual_expense_amount',
          'Actual_reimbursement_amount',
          'Attach_Receipts',
          'created_by_user_id',
          'Activity_Instance_ID'
        ]);     
      }
      else if(tab === "approvedTasks") {
        setFieldsToDisplay([
          'Expense_ID', 
          'Common_date',
          'Common_category', 
          'Actual_expense_amount',
          'Actual_reimbursement_amount',
          'Attach_Receipts',
          'created_by_user_id',
          '_current_step',
          'Activity_Instance_ID'
        ]);
      }
      else if(tab === "rejectedTasks"){
        setFieldsToDisplay( [
          'Expense_ID', 
          'Common_date',
          'Common_category', 
          'Actual_expense_amount',
          'Actual_reimbursement_amount',
          'Attach_Receipts',
          'created_by_user_id',
          '_current_step',
          'Activity_Instance_ID'
        ]);
      }
      else{
        if(tab === "pendingItems"){
          setFieldsToDisplay( [
            'Expense_ID', 
            'Common_date',
            'Common_category', 
            'Actual_expense_amount',
            'Actual_reimbursement_amount',
            'Attach_Receipts',
            '_current_step',
            'Activity_Instance_ID'
          ]);
        }
        else{
          setFieldsToDisplay( [
            'Expense_ID', 
            'Common_date',
            'Common_category', 
            'Actual_expense_amount',
            'Actual_reimbursement_amount',
            'Attach_Receipts',
            'Activity_Instance_ID'
          ]);
        }
        
      }
    }
    else if(currentPageId.includes("Advances")){
      if(tab === "pendingTasks"){
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
      else if(tab === "approvedTasks"){
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
      else if(tab === "rejectedTasks"){
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
      else{
        if(tab === "pendingItems"){
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
            'Activity_Instance_ID'
          ]);
        }
      }
    }

    // constructing api Urls to fetch data for the current tab
    if(mode === "myTasks"){
      if(tab === "pendingTasks"){  
        setCurrentTab("pendingTasks");
  
        setPendingType("primary");
        setApprovedType("default");
        setRejectedType("default");

        const apiUrl = `/process-report/2/${account_id}/${process_id}/${pending_report_id}?`;
          
        setUrl(apiUrl);
      }
      else if(tab === "approvedTasks"){  
        setCurrentTab("approvedTasks");
  
        setPendingType("default");
        setApprovedType("primary");
        setRejectedType("default");
  
        const apiUrl = `/process-report/2/${account_id}/${process_id}/${approved_report_id}?`;
          
        setUrl(apiUrl);
      }
      else if(tab === "rejectedTasks"){  
        setCurrentTab("rejectedTasks");
  
        setPendingType("default");
        setApprovedType("default");
        setRejectedType("primary");
  
        const apiUrl = `/process-report/2/${account_id}/${process_id}/${rejected_report_id}?`;
    
        setUrl(apiUrl);
      }
    }
    else if(mode === "myItems"){
      if(tab === "pendingItems"){
        setCurrentTab("pendingItems");
  
        setPendingType("primary");
        setTodoType("default");
        setwithdrawType("default");
        setApprovedType("default");
        setRejectedType("default");
  
        const apiUrl = `/process-report/2/${account_id}/${process_id}/${myItems_report_id}?$status=InProgress&`;
    
        setUrl(apiUrl);
      }
      else if(tab === "todoItems"){  
        setCurrentTab("todoItems");
  
        setPendingType("default");
        setTodoType("primary");
        setwithdrawType("default");
        setApprovedType("default");
        setRejectedType("default");

        const apiUrl = `/process-report/2/${account_id}/${process_id}/${todoItems_report_id}?`;
    
        setUrl(apiUrl);
      }
      else if(tab === "withdrawnItems"){
        setCurrentTab("withdrawnItems");
  
        setPendingType("default");
        setTodoType("default");
        setwithdrawType("primary");
        setApprovedType("default");
        setRejectedType("default");
  
        const apiUrl =`/process-report/2/${account_id}/${process_id}/${myItems_report_id}?$status=Withdrawn&`;
    
        setUrl(apiUrl);
      }
      else if(tab === "approvedItems"){
        setCurrentTab("approvedItems");
  
        setPendingType("default");
        setTodoType("default");
        setwithdrawType("default");
        setApprovedType("primary");
        setRejectedType("default");
  
        const apiUrl = `/process-report/2/${account_id}/${process_id}/${myItems_report_id}?$status=Completed&`;
    
        setUrl(apiUrl);
      }
      else if(tab === "rejectedItems"){
        setCurrentTab("rejectedItems");
  
        setPendingType("default");
        setTodoType("default");
        setwithdrawType("default");
        setApprovedType("default");
        setRejectedType("primary");
  
        const apiUrl = `/process-report/2/${account_id}/${process_id}/${myItems_report_id}?$status=Rejected&`;
    
        setUrl(apiUrl);
      }
    }

    setCurrentPage(1);
    // setting randNum again to this flag to trigger url / searchQuery useEffect
    setWatchParamsUrlFlag(randNum.current);
  };


  // url / searchQuery useEffect
  // To call function to fetch data only after setting URL
  useEffect(() => {
    if(url !== ''){
      try {
        fetchData(currentPage, searchQuery);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        // setLoading(false);
        // setemptyicon('block');
      }
    }
  }, [url, searchQuery, watchParamsUrlFlag])


  // Function to fetch data for the current tab based on pageNumber & search query
  const fetchData = async (pageNumber, query) => {

    try{

      if (query) {
        setSearchQuery(query);
      } else {
      }

      const queryString = searchQuery ? `q=${searchQuery}&` : '';

      if(pageNumber === 1 || searchQuery !== ''){
        const _url = url.split('?')[0];
        const urlFilter = url.split('?')[1];
        kf.api(`${_url}/count?${urlFilter}${queryString}page_number=${pageNumber}&page_size=${itemsPerPage}`).then((paginationCountResponse) => {
          setPaginationTotal(paginationCountResponse.Count);
        });
      }

      kf.api(`${url}${queryString}page_number=${pageNumber}&page_size=${itemsPerPage}`).then((apiResp) => {
  
        if(apiResp){

          const apiRespData = apiResp.Data;

          if(apiRespData.length > 0){

            const filteredMain = apiResp.Columns.filter((itemMain) => {
              return fieldsToDisplay.some((itemFlow) => itemMain.FieldId === itemFlow);
            });
  
            const generateColumns = (columns) => {

              return columns.map((each) => {
                if (each.FieldId === "Expense_ID" || each.FieldId === "Advance_Request_ID") {
                  return {
                    title: each.Name,
                    dataIndex: each.Id,
                    key: each.Name,
                    render: (text, record) => (
                      <a
                        onClick={async () => {
                          try{

                            let instance_id = record._id;
                            let apiCallUrl = '';
                            if(currentTab === "pendingTasks" || currentTab === "todoItems"){
                              apiCallUrl = `/process/2/${account_id}/${ids.process_id}/pending?page_size=10000`;
                            }
                            else if(currentTab === "approvedTasks"){
                              apiCallUrl = `/process/2/${account_id}/${ids.process_id}/myitems/participated?page_size=10000`;
                            }
                            else if(currentTab === "rejectedTasks"){
                              apiCallUrl = `/process/2/${account_id}/${ids.process_id}/myitems/rejected?page_size=10000`;
                            }
                            else{
                              apiCallUrl = `/process/2/${account_id}/${ids.process_id}/myitems?page_size=10000`;
                            }

                            const response = await kf.api(apiCallUrl, { method: 'GET' });
        
                            const matchingData = response.Data.find(item => item._id === instance_id);
    
                            if (matchingData) {
                              const activity_instance_id = matchingData._activity_instance_id;

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
                  return {
                    title: 'Reimbursable amount',
                    dataIndex: each.Id,
                    key: each.Name,
                    ...(each.FieldId==="Activity_Instance_ID" && { hidden: true }),
                  };
                }
                else if (each.FieldId === "Attach_Receipts" || each.FieldId === "Attacments") {
                  return {
                    title: 'Receipts',
                    dataIndex: each.Id,
                    key: each.Name,
                    render: (text, record) => {
                      if(text){
                        return(
                          <div>
                            <Tooltip placement="topLeft" title={"Receipt"}>
                              <Image preview={false} width={24} height={24} src={receipt} onClick={() => openReceipt(record)}/>
                            </Tooltip>
                          </div>
                        );
                      }
                      else{
                        return null;
                      }
                    },
                    ...(each.FieldId==="Activity_Instance_ID" && { hidden: true }),
                  };
                }
                else if (each.FieldId === "created_by_user_id") {
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
  
            if(currentTab === "pendingTasks"){
              const col=[...columns, {
                title: 'Actions',
                key: 'action',
                render: (text,record) => (
                  <Space size="middle">
                    <Button 
                      type="primary" 
                      icon={<CheckOutlined />} 
                      className = "clsApproveBtn"
                      onClick={() => handleApprove(record, ids.process_id)}
                    />
                    <Button 
                      type="primary" 
                      icon={<CloseOutlined />} 
                      className="clsRejectBtn"
                      onClick={() => handleReject(record, ids.process_id)}
                    />
                  </Space>
                ),
              }]
      
              setTableColumns(col);
            }
            else{
              setTableColumns(columns);
            }
            setTableData(apiRespData);
            // setLoading(false);
    
            const handleApprove = async (record, process_id) => {
              const instance_id = record._id;

              try{

                let apiCallUrl = `/process/2/${account_id}/${ids.process_id}/pending?page_size=10000`;

                const response = await kf.api(apiCallUrl, { method: 'GET' });

                if (response === 'Matching data not found for _id') {
                  kf.client.showInfo('Your request is already processed');
                  return;
                }

                const matchingData = response.Data.find((item) => item._id === instance_id);

                if (matchingData) {
                  let activity_instance_id = matchingData._activity_instance_id;
                  let requester = matchingData._created_by["Name"];

                  let getItemUrl = `/process/2/${account_id}/${ids.process_id}/${instance_id}/${activity_instance_id}`;
                  const itemResp = await kf.api(getItemUrl, { method: 'GET' });

                  let amount = currentPageId.includes("Expense") ? itemResp.Actual_expense_amount : itemResp.Advance_Amount;

                  let showConfirmContent = '';

                  if(itemResp.Duplicate_expenses_count){
                    showConfirmContent = requester + ' has claimed for an amount of '+ amount +'. '+ itemResp.Duplicate_expenses_count +' possible duplicate(s) found for this request. Are you sure you want to approve?'
                  }
                  else{
                    showConfirmContent = requester + ' has claimed for an amount of '+ amount +'. Are you sure you want to approve?'
                  }

                  kf.client.showConfirm({
                    title: 'Confirm Approval',
                    content: showConfirmContent
                  })
                  .then((res)=>{
                    if(res === "OK"){
                      kf.api(`/process/2/${account_id}/admin/${process_id}/${instance_id}?_application_id=${application_id}`,
                      {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          "Approved_manager" : {
                              "_id" : user_id
                          }
                        })
                      }).then(updateResp => {
                        kf.api(`/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}/submit?_application_id=${application_id}`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                        })
                        .then((submitResp) => {
                          if(submitResp){

                            setTimeout(() => {
                              let randNum = Math.random();
                              kf.app.setVariable('expAdvRandNum',randNum);
                            }, 1000);
                          }
                        });
                      });
                    }
                    else{
                    }
                  }
                  ).catch((err)=>{
                    console.error(err,'Error in callback: handleApprove')
                  });
                }
              }
              catch (error) {
                console.error('Error performing action:', error);
              }
            };
            
            const handleReject = async (record, process_id) => {
              const instance_id = record._id;
  
              try{

                let apiCallUrl = `/process/2/${account_id}/${ids.process_id}/pending?page_size=10000`;
            
                const response = await kf.api(apiCallUrl, { method: 'GET' });
                        
                if (response === 'Matching data not found for _id') {
                  kf.client.showInfo('Your request is already processed');
                  return;
                }
            
                const matchingData = response.Data.find((item) => item._id === instance_id);
            
                if (matchingData) {
                  let activity_instance_id = matchingData._activity_instance_id;
                  let requester = matchingData._created_by["Name"];
            
                  let getItemUrl = `/process/2/${account_id}/${ids.process_id}/${instance_id}/${activity_instance_id}`;
                  const itemResp = await kf.api(getItemUrl, { method: 'GET' });
                        
                  let amount = currentPageId.includes("Expense") ? itemResp.Actual_expense_amount : itemResp.Advance_Amount;
            
                  let showRejectContent = '';
            
                  if(itemResp.Duplicate_expenses_count){
                    showRejectContent = requester + ' has claimed for an amount of '+ amount +'. '+ itemResp.Duplicate_expenses_count +' possible duplicate(s) found for this request. Are you sure you want to reject?'
                  }
                  else{
                    showRejectContent = requester + ' has claimed for an amount of '+ amount +'. Are you sure you want to reject?'
                  }
              
                  kf.client.showConfirm({
                    title: 'Confirm Reject',
                    content: showRejectContent,
                  })
                  .then((res)=>{
                    if(res === "OK"){
                      kf.api(`/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}/reject`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                      })
                      .then((rejectResp) => {
                        if(rejectResp){

                          setTimeout(() => {
                            let randNum = Math.random();
                            kf.app.setVariable('expAdvRandNum',randNum);
                          }, 1000);
                        }
                      });
                    }
                    else{
                    }
                  })
                  .catch((err)=>{
                    console.error(err,'Error in callback: handleReject')
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
            // setLoading(false);
            setemptyicon('block');
          }
        }
        // setLoading(false);
      });
    }
    catch (error) {
      console.error('Error fetching data:', error);
    } 
    // finally {
    //   setLoading(false);
    // }
  }


  // Function to preview Receipt
  // Currently not in use
  const openReceipt = async (record) =>{
    // console.log("in openReceipt");
    // console.log("receipt details : ",record[receiptIdField]);
    kf.app.showInfo("Receipt preview");
  }


  // tableData useEffect - to disable skeleton loading once the table data is fetched
  useEffect(() => {
    setLoading(false);
  }, [tableData])


  // Function to handle page change on pagination click
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchData(newPage, searchQuery);
  };


  // Function to handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
    setLoading(true);

    // setting timeout to minimise apiCalls to fetch matched data
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    setSearchTimeout(
      setTimeout(() => {
        fetchUrl(ids, currentTab)
      }, searchDelay)
    );
  };


  // Function to handle mode change
  const handleModeChange = (e) => {
    setMode(e.target.value);
    setLoading(true);
  };


  // Function to open form popup
  const openNewForm = () => {    
    const kf = window.kf;
    kf.app.page.openPopup(newFormPopupId);
  };


  // Function to open popup to view policy
  const viewPolicy = async () => {    
    const kf = window.kf;

    let policy_form_id = await kf.app.getVariable("policy_form_id");
    if(!policy_form_id || policy_form_id === ''){
      policy_form_id = 'Policy_master_A00';
    }

    kf.api(`/form/2/${account_id}/${policy_form_id}/list`).then((policyResp) => {

      let policy_category = currentPageId.includes("Expense") ? "Expense" : "Advance";

      if(policyResp !== undefined && policyResp.Data && policyResp.Data.length > 0){
        let policy_info = policyResp.Data.find(item => item.Policy_category === policy_category);

        if(policy_info !== undefined){
          kf.app.page.openPopup(policyDocPopupId, {instance_id : policy_info._id, isPolicyAvailable : true});
        }
        else{
          kf.app.page.openPopup(policyDocPopupId, {isPolicyAvailable : false});
        }
      }
      else{
        kf.app.page.openPopup(policyDocPopupId, {isPolicyAvailable : false});
      }
    })
    
  };

  const noDataText = currentPageId.includes("Expenses") ? "No expense request yet" : "No advance request yet";
  const noDataSubText = currentPageId.includes("Expenses") ? "It seems like no expense requests have been added yet" : "It seems like no advance requests have been added yet";
  return (
    <>
      <div style={{backgroundColor: '#F5F7FA'}}>
        {(user_role === "Admin" || user_role === "Manager" || user_role === "Finance manager") ? (
          <Space
            direction="vertical"
            size="middle"
            style={{
              display: 'flex'
            }}
          >
            <Title className='clsTitle' level={4}>
              {currentPageId.includes("Expenses") ? "Expenses" : "Advances"}
            </Title>

            <div className='clsModeRow' style={{ backgroundColor: '#F5F7FA' }}>
              <div className='clsHomeRowLeft'>
                <Radio.Group onChange={handleModeChange} value={mode} style={{ marginBottom: 8 }}>
                  <Radio.Button value="myTasks">For my approval</Radio.Button>
                  <Radio.Button value="myItems">{currentPageId.includes('Expenses') ? 'My expenses' : 'My advances'}</Radio.Button>
                </Radio.Group>
              </div>
              <div className='clsHomeRowRight'>
                <Button type="link" onClick={viewPolicy} style={{color:'rgba(5, 101, 255, 1)'}}>View policy</Button>
                <Button type="primary" onClick={openNewForm}> + New request  </Button>
              </div>
            </div>
          </Space>
        ) : (
          <Space
            direction="vertical"
            size="middle"
            style={{
              display: 'flex'
            }}
          >
            <div className='clsModeRow' style={{ backgroundColor: '#F5F7FA' }}>
              <div className='clsHomeRowLeft'>
                <Title className='clsEmpTitle' level={4}>
                  {currentPageId.includes("Expenses") ? "Expenses" : "Advances"}
                </Title>
              </div>
              <div className='clsHomeRowRight'>
                <Button type="link" onClick={viewPolicy} style={{color:'rgba(5, 101, 255, 1)'}}>View policy</Button>
                <Button type="primary" onClick={openNewForm}> + New request  </Button>
              </div>
            </div>
          </Space>
        )}
        <div style={{
          backgroundColor: 'white',
          padding: '1px',
          borderLeft: '20px solid #F5F7FA',
          borderRight: '20px solid #F5F7FA',
          borderRadius: '4px',
        }}>
          <Space
            direction="vertical"
            size="middle"
            style={{
              display: 'flex',
              boxShadow: '1px -1px 1px #d9d9d9, -1px 0px 1px #d9d9d9, -1px 1px 1px #d9d9d9'
            }}
          >
            <div className='clsTabHomeRow'>
              <div className='clsHomeRowLeft'>
                {mode === "myTasks" ? (<>
                  <Space wrap>
                    <div style={{backgroundColor:"white"}}>
                      <Button style={{ left: '10px' }} type={pendingType} shape="round" size={'small'} onClick={() => {fetchUrl(ids, "pendingTasks")}}>
                        Pending ({pendingTotal})
                      </Button>
                    </div>
                    <div style={{backgroundColor:"white"}}>
                      <Button style={{ left: '10px' }} type={approvedType} shape="round" size={'small'} onClick={() => fetchUrl(ids, "approvedTasks")}>
                        Approved ({approvedTotal})
                      </Button>
                    </div>
                    <div style={{backgroundColor:"white"}}>
                      <Button style={{ left: '10px' }} type={rejectedType} shape="round" size={'small'} onClick={() => fetchUrl(ids, "rejectedTasks")}>
                        Rejected ({rejectedTotal})
                      </Button>
                    </div>
                  </Space>
                </>) : (<>
                  <Space wrap>
                    <div style={{backgroundColor:"white"}}>
                      <Button style={{ left: '10px' }} type={pendingType} shape="round" size={'small'} onClick={() => fetchUrl(ids, "pendingItems")}>
                        Submitted ({pendingTotal})
                      </Button>
                    </div>
                    <div style={{backgroundColor:"white"}}>
                      <Button style={{ left: '10px' }} type={todoType} shape="round" size={'small'} onClick={() => fetchUrl(ids, "todoItems")}>
                        To-do ({todoTotal})
                      </Button>
                    </div>
                    <div style={{backgroundColor:"white"}}>
                      <Button style={{ left: '10px' }} type={withdrawType} shape="round" size={'small'} onClick={() => fetchUrl(ids, "withdrawnItems")}>
                        Withdrawn ({withdrawnTotal})
                      </Button>
                    </div>
                    <div style={{backgroundColor:"white"}}>
                      <Button style={{ left: '10px' }} type={approvedType} shape="round" size={'small'} onClick={() => fetchUrl(ids, "approvedItems")}>
                        Approved ({approvedTotal})
                      </Button>
                    </div>
                    <div style={{backgroundColor:"white"}}>
                      <Button style={{ left: '10px' }} type={rejectedType} shape="round" size={'small'} onClick={() => fetchUrl(ids, "rejectedItems")}>
                        Rejected ({rejectedTotal})
                      </Button>
                    </div>
                  </Space>
                </>)
                }
              </div>
              <div className='clsHomeRowRightSearch'>
                <FilterComponent filterText={searchQuery} onFilter={(e) => handleSearch(e.target.value)} />
              </div>
            </div>
        
            {loading ? (
              <Skeleton active />
            ) : (
              <>
            <Table
              size="medium"
              rowClassName="clsTable"
              columns={tableColumns}
              dataSource={tableData}
              locale={{
                emptyText: (
                  <div style={{ textAlign: 'center',display:emptyicon }}>
                    <EmptyState height="240" width="160" />
                    <p style={{ fontSize: '14px', margin: '0px !important', color: "#2E3032", marginTop: '0px'}}>{noDataText}</p>
                    <p style={{ fontSize: '12px', color: "#545C6B"}}>{noDataSubText}</p>
                  </div>
                ),
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
              loading={{
                spinning: loading,
                indicator: (
                  <>
                    <Skeleton.Button style={{ width: '98%', marginBottom: '1%' }} size="large" block="TRUE" active="TRUE" />
                    <Skeleton.Button style={{ width: '98%', marginBottom: '1%' }} size="large" block="TRUE" active="TRUE" />
                    <Skeleton.Button style={{ width: '98%', marginBottom: '1%' }} size="large" block="TRUE" active="TRUE" />
                    <Skeleton.Button style={{ width: '98%', marginBottom: '1%' }} size="large" block="TRUE" active="TRUE" />
                    <Skeleton.Button style={{ width: '98%', marginBottom: '1%' }} size="large" block="TRUE" active="TRUE" />
                  </>
                ),
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
        </div>
      </div>
    </>
  );

}

export default MyTable;
