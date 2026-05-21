import { activities } from "../../mocks/procurement-data";

const ActivityTimeline = () => {

  const getActivityIcon = (type) => {
    const iconMap = {
      approval: { icon: "ri-checkbox-circle-line", class: "icon-success" },
      creation: { icon: "ri-add-circle-line", class: "icon-info" },
      rejection: { icon: "ri-close-circle-line", class: "icon-danger" },
      payment: { icon: "ri-money-dollar-circle-line", class: "icon-success" },
      delivery: { icon: "ri-truck-line", class: "icon-primary" },
    };

    return iconMap[type] || { icon: "ri-information-line", class: "icon-default" };
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="timeline-card">
      <div className="timeline-header">
        <h2 className="timeline-title">Recent Activity</h2>
        <button className="timeline-view">View All</button>
      </div>

      <div className="timeline-list">
        {activities.map((activity, index) => {
          const iconData = getActivityIcon(activity.type);
          return (
            <div key={activity.id} className="timeline-item">

              {index !== activities.length - 1 && (
                <div className="timeline-line"></div>
              )}

              <div className="timeline-row">
                <div className={`timeline-icon ${iconData.class}`}>
                  <i className={iconData.icon}></i>
                </div>

                <div className="timeline-content">
                  <div className="timeline-top">
                    <div className="timeline-text">
                      <p>
                        <span className="user">{activity.user}</span>{" "}
                        <span className="action">{activity.action}</span>{" "}
                        <span className="target">{activity.target}</span>
                      </p>
                      <p className="description">{activity.description}</p>
                    </div>
                    <span className="time">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityTimeline;
