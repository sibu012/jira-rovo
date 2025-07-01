import api, {route} from '@forge/api'

export function messageLogger(payload){
  console.log(`Logging message: ${payload.message}`);
}

// New function to update ticket status
export async function updateTicketStatus({ ticketKey, status, comment = null }) {
  console.log(`Updating ticket ${ticketKey} to status: ${status}`);

  if (!ticketKey || !status) {
    return { error: "Ticket key and status are required parameters." };
  }

  try {
    // First, get available transitions for the ticket
    const transitionsRes = await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${ticketKey}/transitions`);

    const transitionsData = await transitionsRes.json();

    if (!transitionsRes.ok) {
      console.error(`Failed to get transitions for ${ticketKey}: ${JSON.stringify(transitionsData)}`);
      return { error: `Failed to get transitions. Status: ${transitionsRes.status}` };
    }

    // Find the transition that matches the desired status
    const transition = transitionsData.transitions.find(t => 
      t.to.name.toLowerCase() === status.toLowerCase()
    );

    if (!transition) {
      return { error: `No available transition to status '${status}' for ticket ${ticketKey}` };
    }

    // Prepare the transition payload
    const payload = {
      transition: {
        id: transition.id
      }
    };

    // Add comment if provided
    if (comment) {
      payload.update = {
        comment: [{
          add: {
            body: {
              type: "doc",
              version: 1,
              content: [{
                type: "paragraph",
                content: [{
                  type: "text",
                  text: comment
                }]
              }]
            }
          }
        }]
      };
    }

    // Execute the transition
    const updateRes = await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${ticketKey}/transitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

    if (!updateRes.ok) {
      const errorData = await updateRes.json();
      console.error(`Failed to update ticket ${ticketKey}: ${JSON.stringify(errorData)}`);
      return { error: `Failed to update ticket. Status: ${updateRes.status}` };
    }

    return { 
      success: true, 
      message: `Successfully updated ticket ${ticketKey} to ${status}`,
      ticketKey: ticketKey,
      newStatus: status
    };

  } catch (error) {
    console.error("Unexpected error during ticket update:", error);
    return { error: `An unexpected error occurred: ${error.message}` };
  }
}

export async function searchSupportTickets({ query }) {
  const jqlToExecute = query;
  //  console.log(`Route: ${route}`);
  console.log(`Executing JQL provided by Rovo before: ${jqlToExecute}`);


  if (!jqlToExecute || !jqlToExecute.trim()) {
    return { error: "No JQL query provided. Rovo must send a valid JQL string." };
  }


  try {

    const res = await api
      .asApp() 
      .requestJira(route`/rest/api/3/search?jql=${jqlToExecute}&maxResults=5`); 

    const data = await res.json();

    if (!res.ok) {

      console.error(`Jira API Error (${res.status}) executing JQL: ${JSON.stringify(data)}`);
      return { error: `Failed to execute JQL. Status: ${res.status}. Details: ${data.errorMessages ? data.errorMessages.join(', ') : 'Unknown error.'}` };
    }


    // console.log(data.issues)


    return data.issues.map((issue) => ({
      id: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description,
      link: `https://andile.atlassian.net/browse/${issue.key}`,

      comments: issue.fields.comment && issue.fields.comment.comments ?
                issue.fields.comment.comments.map(comment => ({
                  id: comment.id,
                  author: comment.author ? comment.author.displayName : 'Unknown',

                  body: comment.body && comment.body.content && comment.body.content[0] &&
                        comment.body.content[0].content && comment.body.content[0].content[0] &&
                        comment.body.content[0].content[0].text
                        ? comment.body.content[0].content[0].text
                        : '[No plain text content]',
                  created: comment.created,
                }))
                : []
    }));

  } catch (error) {

    console.error("Unexpected error during Jira search API call:", error);
    return { error: `An unexpected error occurred: ${error.message}` };
  }
}