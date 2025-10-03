import { Link } from "react-router-dom"
import PageContainer from "../components/base/PageContainer";

export default function LogoutSuccess(){
    return (
        <PageContainer className="my-5">
            <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: 500 }}>
                <h1>You have successfully been logged out!</h1>
                <p>Click below to login.</p>
                <Link to="/login" className="btn btn-primary w-100">
                    Login
                </Link>
            </div>
        </PageContainer>
    )
}