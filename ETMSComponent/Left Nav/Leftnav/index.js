import React, {useState} from 'react';
import { Menu } from 'antd';
import { RightOutlined } from '@ant-design/icons';

const reset_items = [
  {label : 'Budget', key : 0,},
  {label : 'Department', key : 1},
  {label : 'Category', key : 2},
  {label : 'Mileage', key : 3},
  {label : 'Financial year', key : 4},
  {label : 'Employee', key : 5},
  {label : 'Currency conversion', key : 6},
  {label : 'Policy', key : 7}
]

const initial_items = [
  {label : 'Budget', key : 0, icon: <RightOutlined />},
  {label : 'Department', key : 1},
  {label : 'Category', key : 2},
  {label : 'Mileage', key : 3},
  {label : 'Financial year', key : 4},
  {label : 'Employee', key : 5},
  {label : 'Currency conversion', key : 6},
  {label : 'Policy', key : 7}
]

export function LeftNavComp(){
  const [items,setItems] = useState(initial_items);

  const onClick = async (e) => {
    let kf = window.kf;
    const key = e.key;
    console.log("clicked key = ",key);

    const updatedItems = [...reset_items];
    updatedItems[key] = { ...updatedItems[key], icon: <RightOutlined /> };
    setItems(updatedItems)
    console.log("updatedItems = ",updatedItems);
    
    let budget = await kf.app.page.getComponent("Container_3FORG69iO");
    let department = await kf.app.page.getComponent("Container_c_RHAn7EQ");
    let category = await kf.app.page.getComponent("Container_Xo0xdmQDU");
    let mileage = await kf.app.page.getComponent("Container_0DySxFGTr");
    let financial_year = await kf.app.page.getComponent("Container_sU6Lx2OWu");
    let employee = await kf.app.page.getComponent("Container_sdqhzYVwG");
    let currency = await kf.app.page.getComponent("Container_y6xENZF4s");
    let policy = await kf.app.page.getComponent("Container_hU31ofJiP");

    if(key === '0') {
      console.log("budget onclicked");
      budget.show();
      department.hide();
      category.hide();
      mileage.hide();
      financial_year.hide();
      employee.hide();
      currency.hide();
      policy.hide();
    }
    else if(key === '1') {
      console.log("department onclicked");
      budget.hide();
      department.show();
      category.hide();
      mileage.hide();
      financial_year.hide();
      employee.hide();
      currency.hide();
      policy.hide();
    }
    else if(key === '2') {
      console.log("category onclicked");
      budget.hide();
      department.hide();
      category.show();
      mileage.hide();
      financial_year.hide();
      employee.hide();
      currency.hide();
      policy.hide();
    }
    else if(key === '3') {
      console.log("mileage onclicked");
      budget.hide();
      department.hide();
      category.hide();
      mileage.show();
      financial_year.hide();
      employee.hide();
      currency.hide();
      policy.hide();
    }
    else if(key === '4') {
      console.log("FY onclicked");
      budget.hide();
      department.hide();
      category.hide();
      mileage.hide();
      financial_year.show();
      employee.hide();
      currency.hide();
      policy.hide();
    }
    else if(key === '5') {
      console.log("employee onclicked");
      budget.hide();
      department.hide();
      category.hide();
      mileage.hide();
      financial_year.hide();
      employee.show();
      currency.hide();
      policy.hide();
    }
    else if(key === '6') {
      console.log("currency onclicked");
      budget.hide();
      department.hide();
      category.hide();
      mileage.hide();
      financial_year.hide();
      employee.hide();
      currency.show();
      policy.hide();
    }
    else if(key === '7') {
      console.log("policy onclicked");
      budget.hide();
      department.hide();
      category.hide();
      mileage.hide();
      financial_year.hide();
      employee.hide();
      currency.hide();
      policy.show();
    }
  };

  return (
    <>
    <div style = {{height:'100vh'}}>
      <Menu
        style={{
          width: 256,
          height:'100%',
        }}
        defaultSelectedKeys={['0']}
        mode='inline'
        theme='light'
        items={items}
        onClick={onClick}
      />
      </div>
    </>
  );
};