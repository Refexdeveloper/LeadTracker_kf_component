import React, { useState, useEffect } from 'react';
import { Avatar, Card, Skeleton,Tooltip, Row, Col } from 'antd';
import bus from './Images/bus.png';
import train from './Images/train.png';
import { ReactComponent as EmptyState} from './Images/noData.svg';
import './index.css';
const { Meta } = Card;


const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();

  let dayString = day.toString();
  if (day > 10 && day < 20) {
    // For numbers between 11 and 19, use 'th' suffix
    dayString += 'th';
  } else {
    // For other numbers, determine the appropriate suffix
    const lastDigit = day % 10;
    switch (lastDigit) {
      case 1:
        dayString += 'st';
        break;
      case 2:
        dayString += 'nd';
        break;
      case 3:
        dayString += 'rd';
        break;
      default:
        dayString += 'th';
        break;
    }
  }

  return `${dayString} ${month} `;
};
 
const formatYear = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  return year.toString();
};

function  App(){
  const [emptyicon, setemptyicon] = useState('none');
  const [apiresponse, setApiResponse] = useState([])
  const [loading, setLoading] = useState(true);
  const [col_From, setColFrom] = useState(null);
  const [col_To,setColTo]= useState(null);
  const [col_From_Date, setColFromDate] = useState(null);
  const [col_To_Date,setColToDate]= useState(null);
  const [col_Description,setColDescription] =useState(null);
  const [col_mode_of_trans,setColModeOfTrans] =useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const kf = window.kf;
        const application_id = await kf.app._id
        const account_id = await kf.account._id

        let travel_process_id = await kf.app.getVariable("travel_process_id");
        let upcoming_travels_report_id = await kf.app.getVariable("upcoming_travels_report_id");

        let process_list = '';
        if (!travel_process_id || travel_process_id === '') {

          process_list = await kf.api(`/flow/2/${account_id}/process?_application_id=${application_id}`);
          console.log("process_list = ",process_list);

          const travel_process_name = 'Travel Management';
        
          const travel_process_info = process_list.find(itm => itm.Name === travel_process_name);
          travel_process_id = travel_process_info?._id;
          console.log('Fetched travel_process_id:', travel_process_id);
        
          kf.app.setVariable("travel_process_id", travel_process_id);
        }

        if (!upcoming_travels_report_id || upcoming_travels_report_id === '') {

          const upcomingTravels_report_response = await kf.api(`/flow/2/${account_id}/process/${travel_process_id}/report?_application_id=${application_id}`);
          console.log('Fetched report_response:', upcomingTravels_report_response);
        
          let upcomingTravels_report_name = 'Upcoming travels';
          const upcomingTravels_report_info = upcomingTravels_report_response.find(item => item.Name === upcomingTravels_report_name);
        
          if (upcomingTravels_report_info) {
            upcoming_travels_report_id = upcomingTravels_report_info._id;
            console.log('Fetched upcomingTravels_report_id:', upcoming_travels_report_id);
        
            kf.app.setVariable("upcoming_travels_report_id", upcoming_travels_report_id);
          
          } 
          else {
            console.log('upcoming_travels_report_id not found.');
          }
        }

        const url = `/process-report/2/${account_id}/${travel_process_id}/${upcoming_travels_report_id}?_application_id=${application_id}`;
        const apiresponse = await window.kf.api(url);
        // console.log("apiresponse ", apiresponse);
        setApiResponse(apiresponse);
        const Destination_From = apiresponse.Columns.find(col => col.FieldId === 'common_From')?.Id;
        const Destination_To = apiresponse.Columns.find(col => col.FieldId === 'common_To')?.Id;
        const From_Date = apiresponse.Columns.find(col => col.FieldId === 'Common_from_date')?.Id;
        const To_Date = apiresponse.Columns.find(col => col.FieldId === 'Common_to_date')?.Id;  
        const Description = apiresponse.Columns.find(col => col.FieldId === 'Purpose_of_Travel')?.Id;  
        const Mode_of_Trans =apiresponse.Columns.find(col => col.FieldId === 'Mode_of_Transport')?.Id;

        setColFrom(Destination_From)
        setColTo(Destination_To)
        setColFromDate(From_Date)
        setColToDate(To_Date)
        setColDescription(Description)
        setColModeOfTrans(Mode_of_Trans)
        setLoading(false);

      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, []);

  const viewMoreTravels = async () =>{
    const kf = window.kf;
    console.log("You will be redirected to travels page");
    const travel_page_id = await kf.app.getVariable("travels_page_id");
    kf.app.openPage(travel_page_id);
  }

    return (
      <>
        <Card
          title="My upcoming travels"
          extra={apiresponse?.Data?.length > 2 && (
            <a href="#" onClick={viewMoreTravels}>View more</a>
          )}
          style={{
            width: '100%',
            border: "none"
          }}
        >
          {loading || !apiresponse.Data ? (
            <Skeleton avatar active shape="square" />
          ) : apiresponse.Data?.length > 0 ? (
            apiresponse.Data.slice(0, 2).map((item) => (
              <Row gutter={[16, 16]} style={{ marginBottom: '28px' }}>
                <Col span={12} align="left">
                  <Tooltip
                    title={
                      (item[col_From] !== undefined && item[col_To] !== undefined)
                        ? `${item[col_From]} - ${item[col_To] || ''}` : ''
                    }
                  >
                    <Meta
                      avatar={<Avatar shape="square" src={item[col_mode_of_trans] === 'Public Transport' ? bus : train} />}
                      title={
                        (item[col_From] !== undefined && item[col_To] !== undefined)
                        ? `${item[col_From]} - ${item[col_To] || ''}` : ''
                      }
                      description={item[col_Description]}
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    />
                  </Tooltip>
                </Col>
                <Col span={12} align="right">
                  <Meta
                    style={{ float: "right", position: "relative" }}
                    title={`${formatDate(item[col_From_Date])} - ${formatDate(item[col_To_Date])}`}
                    description={formatYear(item[col_From_Date])}
                  />
                </Col>
              </Row>
            ))
          ) : (
            <>
              <div align="center">
                <EmptyState height="100" width="350" />
                <p style={{ fontSize: '12px', paddingTop: '0px !mportant', color: "#545C6B"}}>No upcoming travels found</p>
              </div>
            </>
          )}
        </Card>
      </>
    );
};
export default App;