import api, {route} from '@forge/api'

export function messageLogger(payload){
  console.log(`Logging message: ${payload.message}`);
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