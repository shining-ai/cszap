#include <stdio.h>
#include <sys/socket.h>

int send_all(int socket_fd, char *buffer, int length)
{
    int total_sent = 0;
    int bytes_remain = length;
    ssize_t bytes_sent;

    while (total_sent < length)
    {
        bytes_sent = send(socket_fd, buffer + total_sent, bytes_remain, 0);
        if (bytes_sent == -1)
        {
            break;
        }
        total_sent += bytes_sent;
        bytes_remain -= bytes_sent;
    }

    return total_sent;
}

int recv_all(int socket_fd, char *buffer, int length)
{
    int total_received = 0;
    int bytes_remain = length;
    ssize_t bytes_received;

    while (total_received < length)
    {
        bytes_received = recv(socket_fd, buffer + total_received, bytes_remain, 0);
        if (bytes_received == -1)
        {
            break;
        }
        total_received += bytes_received;
        bytes_remain -= bytes_received;
    }

    return total_received;
}
